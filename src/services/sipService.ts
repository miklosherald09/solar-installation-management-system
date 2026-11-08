/**
 * SIP Service
 * Softphone implementation built on:
 *   - sip.js               (SIP signalling over WebSocket)
 *   - react-native-webrtc  (WebRTC media)
 *   - react-native-incall-manager (Android audio / in-call lifecycle)
 *   - react-native-callkeep       (iOS CallKit)
 *
 * The public API is intentionally small and app-specific — the rest of the app
 * talks to this module and the call store, never to sip.js/WebRTC directly.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Alert,
  AppState,
  AppStateStatus,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  UserAgent,
  Registerer,
  RegistererState,
  Inviter,
  Invitation,
  Session,
  SessionState,
  SessionDescriptionHandler,
  SessionDescriptionHandlerFactory,
  BodyAndContentType,
} from 'sip.js';
import {
  RTCPeerConnection,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { SIP } from '../constants/sip';
import { api } from './api';
import { getAuthState, initAuthStore } from '../store/useAuthStore';
import { useCallStore, CallStatus } from '../store/useCallStore';
import { sendMessage } from './messagingService';
import { QueryClient } from '@tanstack/react-query';
import {
  startForegroundService,
  stopForegroundService,
  clearIncomingCallNotification,
  onNativeDecline,
} from './sipForegroundService';
import * as callkeep from './callkeepService';
import { completeVoipPush } from './voipPushService';
import { addCallWsListener, ensureCallWs } from './callWsService';

let globalQueryClient: QueryClient | null = null;

export function setGlobalQueryClient(client: QueryClient): void {
  globalQueryClient = client;
}

const IS_ANDROID = Platform.OS === 'android';
const IS_IOS = Platform.OS === 'ios';

let userAgent: UserAgent | null = null;
let registerer: Registerer | null = null;
let activeSession: Session | null = null;
let activeSdh: RnWebRTCSessionDescriptionHandler | null = null;
let initPromise: Promise<void> | null = null;
let appStateListener: { remove: () => void } | null = null;

/** Timer that auto-rejects an incoming call after ~60 s of ringing so the
 *  callee's phone never rings indefinitely when the SIP CANCEL is lost. */
let ringTimeoutId: ReturnType<typeof setTimeout> | null = null;

function clearRingTimeout(): void {
  if (ringTimeoutId !== null) {
    clearTimeout(ringTimeoutId);
    ringTimeoutId = null;
  }
}

// ── iOS: defer the CallKit display so the VoIP-push UUID can win ─────────
// The native AppDelegate reports the VoIP push to CallKit the instant the
// push lands (Apple requires it within ~0.5 s). The JS bridge only learns the
// push's UUID once the RN "notification" event is delivered, which can race
// with the SIP INVITE arriving over WebSocket. If handleIncomingInvite calls
// displayIncomingCall() while the push event is still in flight, iOS ends up
// with TWO CallKit calls for the same SIP invocation: answering one tears the
// other down and the caller sees the call fail. So when no push UUID is known
// yet, poll briefly; the display happens immediately if it was never a push.
let iosDisplayTimer: ReturnType<typeof setInterval> | null = null;

const INCOMING_CALL_DISPLAY_MAX_WAIT_MS = 2500;
const INCOMING_CALL_DISPLAY_POLL_MS = 200;

function cancelIncomingCallDisplay(): void {
  if (iosDisplayTimer !== null) {
    clearInterval(iosDisplayTimer);
    iosDisplayTimer = null;
  }
}

/** Poll for the VoIP-push CallKit UUID before creating a new CallKit call. */
function scheduleIncomingCallDisplay(
  handle: string,
  name: string,
  hasVideo: boolean,
): void {
  cancelIncomingCallDisplay();

  const startedAt = Date.now();
  iosDisplayTimer = setInterval(() => {
    // Call answered / ended while we waited — never show a stale call.
    const status = useCallStore.getState().status;
    if (status !== 'incoming') {
      cancelIncomingCallDisplay();
      return;
    }

    // A push UUID landed: CallKit already presents the call (from the
    // AppDelegate), so don't create a second one — just release the push.
    if (callkeep.hasActiveCall()) {
      cancelIncomingCallDisplay();
      const activeUuid = callkeep.getCallUUID();
      if (activeUuid) completeVoipPush(activeUuid);
      return;
    }

    // No push event in time (non-push call / slow APNs): display from JS so
    // the user can still answer.
    if (Date.now() - startedAt >= INCOMING_CALL_DISPLAY_MAX_WAIT_MS) {
      cancelIncomingCallDisplay();
      const uuid = callkeep.displayIncomingCall(handle, name, hasVideo);
      if (uuid) completeVoipPush(uuid);
    }
  }, INCOMING_CALL_DISPLAY_POLL_MS);
}

/** Flag set when the user taps "Answer" from a notification before
 *  the SIP INVITE has reached the device. When the INVITE arrives, it is
 *  immediately accepted without playing the ringtone. */
let pendingAutoAnswer = false;
let pendingAutoAnswerTimer: ReturnType<typeof setTimeout> | null = null;

/** Guards against re-entering answerActiveCall while an accept is in flight.
 *  Fulfilling the iOS CallKit answer action emits an 'answerCall' event that
 *  re-enters this method through the CallKit handler. */
let isAnsweringIncoming = false;

function clearAutoAnswerTimers(): void {
  if (pendingAutoAnswerTimer !== null) {
    clearTimeout(pendingAutoAnswerTimer);
    pendingAutoAnswerTimer = null;
  }
}

export function setPendingAutoAnswer(pending: boolean): void {
  console.log('[SIP] setPendingAutoAnswer', pending);
  clearAutoAnswerTimers();
  pendingAutoAnswer = pending;
  if (pending) {
    if (activeSession) {
      pendingAutoAnswer = false;
      answerActiveCall();
    } else {
      // Set a 25-second timeout waiting for the incoming INVITE
      pendingAutoAnswerTimer = setTimeout(() => {
        pendingAutoAnswerTimer = null;
        if (pendingAutoAnswer && !activeSession) {
          pendingAutoAnswer = false;
          const currentStatus = useCallStore.getState().status;
          if (currentStatus === 'connecting' || currentStatus === 'incoming') {
            console.warn(
              '[SIP] Auto-answer pending timeout - resetting call status',
            );
            useCallStore.getState().setStatus('ended');
            useCallStore
              .getState()
              .setError('Call unavailable or caller hung up.');
          }
        }
      }, 25_000);
    }
  }
}

/** Unsubscribe function for the native "Decline" notification action. */
let declineUnsub: (() => void) | null = null;

/** SIP account resolved from the backend for the signed-in user. */
interface SipCredentials {
  username: string;
  password: string;
  domain: string;
  wsServer: string;
  transport: 'wss' | 'ws';
  uri: string;
}

let sipAccount: SipCredentials | null = null;
let currentUserId: string | null = null;

/**
 * Asterisk serves SIP-over-WebSocket at the `/ws` path. Backend configs often
 * omit it (e.g. `ws://host:8088`), which makes Asterisk respond with 404 and
 * sip.js report `WebSocket closed ... (code: 1006)`. Append `/ws` when the URL
 * has no path so the connection targets the correct endpoint.
 */
function ensureWsPath(wsServer: string): string {
  const trimmed = wsServer.trim();
  const match = /^(wss?:\/\/[^/]+)(\/.*)?$/.exec(trimmed);
  if (!match) {
    return trimmed;
  }
  const [, base, path] = match;
  if (!path || path === '/') {
    return `${base}/ws`;
  }
  return trimmed;
}

/** Fetch (and lazily provision) the user's SIP credentials from the backend. */
async function fetchSipCredentials(userId: string): Promise<SipCredentials> {
  const creds = await api.get<SipCredentials>(`/sip/credentials/${userId}`);
  return { ...creds, wsServer: ensureWsPath(creds.wsServer) };
}

/** Ensure the SIP stack is started for the signed-in user. */
async function ensureSip(): Promise<void> {
  let userId = getAuthState().user?.id;
  if (!userId) {
    await initAuthStore().catch(() => {});
    userId = getAuthState().user?.id;
  }
  if (!userId) {
    throw new Error('Not signed in — cannot start SIP.');
  }
  await initSip(userId);

  // Check if transport is disconnected and attempt to reconnect
  if (userAgent && !userAgent.isConnected()) {
    console.log('[SIP] ensureSip: transport is disconnected. Reconnecting...');
    try {
      await userAgent.reconnect();
      if (registerer && registerer.state !== RegistererState.Registered) {
        console.log('[SIP] ensureSip: re-registering extension...');
        await registerer.register();
      }
    } catch (err) {
      console.warn('[SIP] ensureSip: failed to reconnect transport:', err);
      throw new Error(
        'SIP transport is disconnected and could not reconnect. Please check your network.',
      );
    }
  }
}

/** Idempotently ensure a user has a PBX extension; returns its number. */
async function ensurePbxUser(
  userId: string,
): Promise<{ ensured: boolean; extension: string }> {
  return api.post<{ ensured: boolean; extension: string }>(
    `/sip/ensure/${userId}`,
    {},
  );
}

/** Keep a leading `+` but drop every other non-digit character. */
function normalizeNumber(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/** Map sip.js session states to our app-level call status. */
function mapSessionState(state: SessionState): CallStatus {
  switch (state) {
    case SessionState.Establishing:
      return 'connecting';
    case SessionState.Established:
      return 'active';
    case SessionState.Terminating:
    case SessionState.Terminated:
      return 'ended';
    case SessionState.Initial:
    default:
      return 'idle';
  }
}

/** Wait until ICE gathering completes or times out quickly (500ms) so SDP offer is sent fast. */
async function waitForIceGathering(
  pc: RTCPeerConnection,
  timeoutMs = 500,
): Promise<void> {
  const started = Date.now();
  while (pc.iceGatheringState !== 'complete') {
    if (Date.now() - started > timeoutMs) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

/** Audio route / in-call lifecycle helpers. */
function startInCallManager(isVideo = false): void {
  if (IS_ANDROID) {
    try {
      InCallManager.start({ media: 'audio' });
      InCallManager.setKeepScreenOn(true);
    } catch {
      // Native module may be unavailable during JS-only development.
    }
  }
  if (isVideo) {
    setSpeaker(true);
  }
}

function stopInCallManager(): void {
  if (!IS_ANDROID) return;
  try {
    InCallManager.setKeepScreenOn(false);
    InCallManager.stop();
  } catch {
    // noop
  }
}

/**
 * Local incoming call ringtone handler.
 * On Android, the native incoming-call notification banner and channel
 * (sip_incoming_call_channel) already handle playing the system ringtone
 * and vibrating. We omit InCallManager.startRingtone here so that two
 * ringtones do not play simultaneously.
 */
function startIncomingRingtone(): void {
  // Sound is handled by native notification on Android.
}

/** Stop the incoming-call ringtone (safe to call even if it never started). */
function stopIncomingRingtone(): void {
  if (!IS_ANDROID) return;
  try {
    InCallManager.stopRingtone();
  } catch {
    // noop
  }
}

let activeRingbackType: string | null = null;

/** Play ringback tone for the caller while alerting/connecting. */
function startOutgoingRingback(type: '_DEFAULT_' | '_DTMF_' = '_DTMF_'): void {
  if (!IS_ANDROID) return;
  if (activeRingbackType === type) return;
  try {
    if (activeRingbackType !== null) {
      InCallManager.stopRingback();
    }
    activeRingbackType = type;
    InCallManager.startRingback(type);
  } catch {
    // noop
  }
}

/** Stop ringback (call answered or ended). */
function stopOutgoingRingback(): void {
  if (!IS_ANDROID) return;
  activeRingbackType = null;
  try {
    InCallManager.stopRingback();
  } catch {
    // noop
  }
}

/**
 * Ensure Android 13+ (API 33+) POST_NOTIFICATIONS permission is granted so
 * incoming-call full-screen notifications actually show. Called proactively
 * during SIP init so the user isn't caught off-guard when a background call
 * arrives.
 */
async function ensureCallNotificationPermission(): Promise<void> {
  if (!IS_ANDROID || Number(Platform.Version) < 33) return;
  const granted = await PermissionsAndroid.check(
    'android.permission.POST_NOTIFICATIONS',
  );
  if (granted) return;

  const result = await PermissionsAndroid.request(
    'android.permission.POST_NOTIFICATIONS',
  );
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    Alert.alert(
      'Call notifications disabled',
      'Without notification permission, incoming calls will not show a screen alert when the app is in the background. You can enable this anytime in Settings → Apps → Solar Installation Management System → Notifications.',
      [{ text: 'OK' }],
      { cancelable: true },
    );
  }
}

/**
 * Ensure the microphone is usable on Android before WebRTC requests it.
 * react-native-webrtc's `getUserMedia` does not reliably prompt for
 * `RECORD_AUDIO` itself, so we request it explicitly.
 */
async function ensureRecordPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const granted = await PermissionsAndroid.check(
    'android.permission.RECORD_AUDIO',
  );
  if (granted) return;
  const result = await PermissionsAndroid.request(
    'android.permission.RECORD_AUDIO',
  );
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Microphone permission is required to make calls.');
  }
}

/**
 * Ensure the camera is usable on Android for video calling.
 */
async function ensureCameraPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const granted = await PermissionsAndroid.check('android.permission.CAMERA');
  if (granted) return;
  const result = await PermissionsAndroid.request('android.permission.CAMERA');
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Camera permission is required to make video calls.');
  }
}

/**
 * Android 12+ requires BLUETOOTH_CONNECT (runtime) to route call audio to
 * Bluetooth headsets. Best-effort — the call still works without it.
 */
async function ensureBluetoothPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (Number(Platform.Version) < 31) return;
  try {
    await PermissionsAndroid.request('android.permission.BLUETOOTH_CONNECT');
  } catch {
    // noop
  }
}

/**
 * SessionDescriptionHandler backed by react-native-webrtc. sip.js ships only a
 * browser WebRTC implementation, so we provide our own that implements the
 * offer/answer exchange using react-native-webrtc's RTCPeerConnection.
 */
class RnWebRTCSessionDescriptionHandler implements SessionDescriptionHandler {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private closed = false;

  constructor(private session: Session) {
    this.pc = new RTCPeerConnection({
      iceServers: SIP.iceServers as Array<{
        urls: string | string[];
        username?: string;
        credential?: string;
      }>,
    });

    this.pc.onconnectionstatechange = () => {
      console.log(
        `[WebRTC] PeerConnection state changed: ${this.pc.connectionState}`,
      );
      const status = useCallStore.getState().status;
      if (this.pc.connectionState === 'failed' && status === 'active') {
        console.warn(
          '[WebRTC] PeerConnection failed during active call. Terminating call.',
        );
        hangupActiveCall();
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log(
        `[WebRTC] ICE connection state changed: ${this.pc.iceConnectionState}`,
      );
      const status = useCallStore.getState().status;
      if (this.pc.iceConnectionState === 'failed' && status === 'active') {
        console.warn(
          '[WebRTC] ICE connection failed during active call. Terminating call.',
        );
        hangupActiveCall();
      }
    };

    // Legacy event form (kept for react-native-webrtc versions that only emit
    // `onaddstream`). Cast: the installed typings only expose `ontrack`.
    (this.pc as any).onaddstream = (event: any) => {
      console.log('[WebRTC] Remote stream added');
      this.remoteStream = event.stream;
      useCallStore.getState().setRemoteStream(event.stream);
    };

    this.pc.ontrack = (event: any) => {
      console.log('[WebRTC] Track added:', event.track?.kind, event.track?.id);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        if (event.track) {
          this.remoteStream.addTrack(event.track);
        }
      }
      useCallStore.getState().setRemoteStream(this.remoteStream);
    };
  }

  async getDescription(
    options?: any,
    modifiers?: any[],
  ): Promise<BodyAndContentType> {
    if (this.closed || !this.pc) {
      throw new Error('Peer connection closed.');
    }
    await this.ensureLocalStream();

    // Use WebRTC signaling state to determine whether to create an offer or answer.
    // When a remote offer is pending (e.g. inbound INVITE or incoming re-INVITE),
    // we MUST create an answer. In stable state (outbound call or initiating renegotiation),
    // we create an offer.
    let description: any;
    if (this.pc.signalingState === 'have-remote-offer') {
      description = await this.pc.createAnswer();
    } else if (this.pc.signalingState === 'stable') {
      description = await this.pc.createOffer(options?.offerOptions ?? {});
    } else {
      console.warn(
        `[WebRTC] getDescription in unexpected signaling state: ${this.pc.signalingState}`,
      );
      if (this.pc.signalingState === 'have-local-offer') {
        description = await this.pc.createOffer(options?.offerOptions ?? {});
      } else {
        description = await this.pc.createAnswer();
      }
    }

    if (modifiers && modifiers.length > 0) {
      for (const modifier of modifiers) {
        description = await modifier(description);
      }
    }

    await this.pc.setLocalDescription(description);
    await waitForIceGathering(this.pc);

    const body = this.pc.localDescription?.sdp ?? '';
    return { body, contentType: 'application/sdp' };
  }

  async setDescription(
    sdp: string,
    _options?: any,
    modifiers?: any[],
  ): Promise<void> {
    if (this.closed || !this.pc) {
      throw new Error('Peer connection closed.');
    }
    const type =
      this.pc.signalingState === 'have-local-offer' ? 'answer' : 'offer';
    let sessionDescription: any = { type, sdp };
    if (modifiers && modifiers.length > 0) {
      for (const modifier of modifiers) {
        sessionDescription = await modifier(sessionDescription);
      }
    }
    await this.pc.setRemoteDescription(sessionDescription);
  }

  hasDescription(contentType: string): boolean {
    return contentType === 'application/sdp';
  }

  sendDtmf(_tones: string): boolean {
    // react-native-webrtc has no RFC 4733 DTMF; out of scope for now.
    return false;
  }

  setMuted(muted: boolean): void {
    for (const track of this.localStream?.getAudioTracks() ?? []) {
      track.enabled = !muted;
    }
  }

  setVideoEnabled(enabled: boolean): void {
    for (const track of this.localStream?.getVideoTracks() ?? []) {
      track.enabled = enabled;
    }
    useCallStore.getState().setVideoEnabled(enabled);
  }

  flipCamera(): void {
    for (const track of this.localStream?.getVideoTracks() ?? []) {
      if (typeof (track as any)._switchCamera === 'function') {
        (track as any)._switchCamera();
      }
    }
    const current = useCallStore.getState().cameraFacing;
    useCallStore
      .getState()
      .setCameraFacing(current === 'user' ? 'environment' : 'user');
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    useCallStore.getState().setLocalStream(null);
    useCallStore.getState().setRemoteStream(null);
    try {
      for (const track of this.localStream?.getTracks() ?? []) {
        try {
          track.stop();
        } catch {
          // noop
        }
      }
    } catch {
      // noop
    }
    try {
      this.pc.close();
    } catch {
      // noop
    }
    try {
      this.localStream?.release();
    } catch {
      // noop
    }
    this.localStream = null;
    this.remoteStream = null;
  }

  private async ensureLocalStream(): Promise<void> {
    if (this.localStream) return;
    await ensureRecordPermission();

    const isVideo = useCallStore.getState().isVideo;
    let stream: MediaStream;

    if (isVideo) {
      try {
        await ensureCameraPermission();
        const facing = useCallStore.getState().cameraFacing;
        try {
          stream = await mediaDevices.getUserMedia({
            audio: true,
            video: {
              facingMode: facing === 'environment' ? 'environment' : 'user',
              width: { min: 640, ideal: 1280 },
              height: { min: 480, ideal: 720 },
              frameRate: 30,
            },
          });
        } catch (constraintErr) {
          console.warn(
            '[WebRTC] Complex video constraints failed, trying basic video:',
            constraintErr,
          );
          stream = await mediaDevices.getUserMedia({
            audio: true,
            video: {
              facingMode: facing === 'environment' ? 'environment' : 'user',
            },
          });
        }
      } catch (cameraErr) {
        // The camera is unavailable or permission was denied. Do NOT fail the
        // whole call — fall back to an audio-only stream so the call can still
        // connect (the caller just won't receive video from this end).
        console.warn(
          '[WebRTC] Camera unavailable. Falling back to audio-only:',
          cameraErr,
        );
        useCallStore.getState().setVideoEnabled(false);
        stream = await mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      }
    } else {
      stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    }

    this.localStream = stream;
    useCallStore.getState().setLocalStream(stream);

    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
    }
  }
}

/** Factory that wires each session's media to our WebRTC handler. */
const sdhFactory: SessionDescriptionHandlerFactory = session => {
  const sdh = new RnWebRTCSessionDescriptionHandler(session);
  activeSdh = sdh;
  return sdh;
};

function tearDownActiveSession(session: Session): void {
  clearRingTimeout();
  clearAutoAnswerTimers();
  pendingAutoAnswer = false;
  stopIncomingRingtone();
  const currentStatus = useCallStore.getState().status;
  if (
    currentStatus === 'ended' ||
    currentStatus === 'active' ||
    currentStatus === 'idle'
  ) {
    stopOutgoingRingback();
  }
  clearIncomingCallNotification();
  callkeep.endCurrentCall();
  if (activeSession === session) {
    activeSession = null;
    activeSdh = null;
  }
  stopInCallManager();
  stopForegroundService();
}

/** Handle an incoming INVITE (someone is calling us). */
function handleIncomingInvite(invitation: Invitation): void {
  console.warn('[handleIncomingInvite]', invitation);
  activeSession = invitation;

  // Industry-standard incoming flow:
  //   1. Send 180 Ringing so the caller hears ringback.
  //   2. Play the local ringtone (Android) or show CallKit UI (iOS).
  //   3. User answers -> 200 OK (answerActiveCall) or rejects -> 486 (hangup).
  invitation.progress().catch(() => {
    // If the caller cancels before 180 is sent, sip.js rejects `progress()`.
    // The state listener below still tears the session down.
  });

  const remoteNumber = invitation.remoteIdentity.uri.user ?? '';

  // Sanitise the SIP display name:
  //   - If the name is "anonymous" or empty, prefer the store's displayName
  //     (which was pre-set from the push notification / intent data).
  const rawRemoteName = (invitation.remoteIdentity.displayName || '').trim();
  const ignoredNames = new Set(['anonymous', 'unknown', '']);
  const remoteName = ignoredNames.has(rawRemoteName.toLowerCase())
    ? ''
    : rawRemoteName;

  const storeDisplayName = useCallStore.getState().call.displayName;
  const displayName =
    remoteName && remoteName !== remoteNumber
      ? remoteName
      : storeDisplayName || remoteNumber || 'Incoming call';

  let hasVideoHeader = false;
  try {
    const req = invitation.request as any;
    if (typeof req?.getHeader === 'function') {
      const h = req.getHeader('X-Is-Video');
      if (h && (h.toLowerCase() === 'true' || h === '1')) {
        hasVideoHeader = true;
      }
    }
    if (!hasVideoHeader && req?.headers) {
      for (const key of Object.keys(req.headers)) {
        if (key.toLowerCase() === 'x-is-video') {
          const val = req.headers[key]?.[0]?.raw ?? req.headers[key];
          if (
            val &&
            (String(val).toLowerCase().includes('true') || String(val) === '1')
          ) {
            hasVideoHeader = true;
            break;
          }
        }
      }
    }
  } catch {}

  const rawBody =
    typeof invitation.request.body === 'string'
      ? invitation.request.body
      : typeof (invitation.request.body as any)?.body === 'string'
      ? (invitation.request.body as any).body
      : typeof (invitation.request.body as any)?.content === 'string'
      ? (invitation.request.body as any).content
      : typeof (invitation as any).body === 'string'
      ? (invitation as any).body
      : '';

  const lowerBody = rawBody.toLowerCase();
  const hasVideoMline =
    lowerBody.includes('m=video') && !lowerBody.includes('m=video 0');
  const storeIsVideo = useCallStore.getState().isVideo;
  const isVideo = hasVideoMline || hasVideoHeader || storeIsVideo;

  console.warn(
    `[SIP] Incoming INVITE: bodyLen=${rawBody.length} hasVideoMline=${hasVideoMline} hasVideoHeader=${hasVideoHeader} storeIsVideo=${storeIsVideo} → isVideo=${isVideo}`,
  );

  useCallStore.getState().setCall({
    callId: invitation.id,
    destination: remoteNumber,
    displayName,
  });
  useCallStore.getState().setIsVideo(isVideo);
  useCallStore.getState().setVideoEnabled(isVideo);
  useCallStore.getState().setCameraFacing('user');
  useCallStore.getState().setStatus('incoming');
  useCallStore.getState().setError(null);

  // The native FCM handler (CustomFirebaseMessagingService) already started
  // the foreground service and posted the full-screen incoming-call
  // notification when the push arrived. Don't duplicate — just play the
  // ringtone here. The foreground-service text is updated to "In call" when
  // the call connects via answerActiveCall.
  clearRingTimeout();
  ringTimeoutId = setTimeout(() => {
    console.warn('[SIP] Ring timeout — auto-rejecting incoming call');
    hangupActiveCall();
  }, 60_000);

  if (pendingAutoAnswer) {
    pendingAutoAnswer = false;
    clearAutoAnswerTimers();
    answerActiveCall();
  } else if (IS_IOS) {
    // If a VoIP push already reported a CallKit call (app woke from killed),
    // do NOT double-display — the user is already seeing the native UI.
    if (callkeep.hasActiveCall()) {
      // The INVITE has arrived — complete the VoIP push immediately so iOS
      // doesn't hold the background thread open longer than necessary.
      const activeUuid = callkeep.getCallUUID();
      if (activeUuid) completeVoipPush(activeUuid);
    } else {
      // The VoIP-push JS event may still be in flight (the native AppDelegate
      // reported to CallKit before the bridge replayed the push UUID). If we
      // immediately call displayIncomingCall() here, iOS ends up with two
      // CallKit calls for the same INVITE and answering one breaks the other.
      // Briefly wait for the push UUID — and only display a fresh CallKit call
      // if the push never materialises.
      scheduleIncomingCallDisplay(remoteNumber, displayName, isVideo);
    }
  } else {
    // Android: ringtone + vibration via incall-manager.
    startIncomingRingtone();
  }

  invitation.stateChange.addListener((state: SessionState) => {
    const status = mapSessionState(state);
    if (status === 'active') {
      clearRingTimeout();
      stopIncomingRingtone();
      // InCallManager is started by answerActiveCall — don't double-start.
    }
    if (status === 'ended') {
      clearRingTimeout();
      stopIncomingRingtone();
    }
    useCallStore.getState().setStatus(status);
    if (state === SessionState.Terminated) {
      if (globalQueryClient) {
        globalQueryClient.invalidateQueries({ queryKey: ['conversations'] });
        setTimeout(() => {
          if (globalQueryClient) {
            globalQueryClient.invalidateQueries({
              queryKey: ['conversations'],
            });
          }
        }, 1500);
      }
      tearDownActiveSession(invitation);
    }
  });
}

/**
 * Start the softphone stack for `userId`: fetch per-user SIP credentials from
 * the backend, create the sip.js UserAgent, connect the WebSocket transport and
 * register the extension. Idempotent per user.
 */
export async function initSip(userId: string): Promise<void> {
  console.log('initSipx', initPromise, currentUserId);

  if (initPromise && currentUserId === userId) {
    return initPromise;
  }
  console.warn('pos1', currentUserId, userId);
  // A different user signed in — tear down the previous stack first.
  if (currentUserId && currentUserId !== userId) {
    await teardownSip();
  }
  console.warn('pos2');

  currentUserId = userId;

  initPromise = (async () => {
    console.warn('pos3');
    try {
      console.warn('pos4');
      const creds = await fetchSipCredentials(userId);
      console.warn('pos5');
      sipAccount = creds;
      // Pre-request Android mic/BT/notification permissions so the first call is instant.
      await ensureRecordPermission().catch(() => {});
      ensureBluetoothPermission().catch(() => {});
      ensureCallNotificationPermission().catch(() => {});
      // Log the exact signaling endpoint so it's easy to verify the app is
      // connecting through Caddy (wss://…/ws) and not directly to :8089.
      console.warn(
        `[SIP] transport=${creds.transport} wsServer=${creds.wsServer} uri=${creds.uri}`,
      );

      const uri = UserAgent.makeURI(creds.uri);
      if (!uri) {
        throw new Error(`Invalid SIP URI configured: ${creds.uri}`);
      }

      console.warn(`[SIP] uri`, uri);

      userAgent = new UserAgent({
        uri,
        authorizationUsername: creds.username,
        authorizationPassword: creds.password,
        displayName: getAuthState().user?.name ?? 'Mobile App',
        contactParams: { transport: creds.transport },
        transportOptions: {
          server: creds.wsServer,
          connectionTimeout: 10,
          traceSip: false,
        },
        sessionDescriptionHandlerFactory: sdhFactory,
        delegate: {
          onInvite: handleIncomingInvite,
          onDisconnect: () => {
            useCallStore.getState().setRegistrationStatus('disconnected');
          },
        },
      });

      console.warn('[SIP] userAgent', userAgent);

      await userAgent.start();

      // AppState change listener for reconnection
      setupAppStateListener();

      // Listen for native "Decline" button presses on the Android notification.
      declineUnsub?.();
      declineUnsub = onNativeDecline(() => hangupActiveCall());

      // Wire CallKit answer/end/mute callbacks to our SIP methods.
      if (IS_IOS) {
        callkeep.setCallKeepHandlers({
          onAnswer: () => {
            if (activeSession instanceof Invitation) {
              answerActiveCall();
            } else {
              setPendingAutoAnswer(true);
            }
          },
          onEnd: () => hangupActiveCall(),
          onMute: (muted: boolean) => {
            // Apply to WebRTC track and store only (CallKit already synced UI).
            activeSdh?.setMuted(muted);
            useCallStore.getState().setMuted(muted);
          },
        });
      }

      registerer = new Registerer(userAgent, {
        expires: SIP.regTimeout,
        refreshFrequency: 99,
        registrar: UserAgent.makeURI(`sip:${creds.domain}`),
      });

      registerer.stateChange.addListener((state: RegistererState) => {
        const regStatus = state.toLowerCase();
        useCallStore.getState().setRegistrationStatus(regStatus);

        const currentUid = getAuthState().user?.id;
        if (currentUid && creds.username) {
          api
            .post('/sip/presence', {
              userId: currentUid,
              extension: creds.username,
              isOnline: state === RegistererState.Registered,
              status:
                state === RegistererState.Registered ? 'ONLINE' : 'OFFLINE',
            })
            .catch(() => {});
        }
      });

      try {
        await registerer.register();
      } catch {
        // Registration failures are reported via the state change listener.
      }
    } catch (err) {
      initPromise = null; // allow a later retry
      throw err;
    }
  })();

  return initPromise;
}

function setupAppStateListener(): void {
  if (appStateListener) return;

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('[SIP] App active. Checking connection health...');
      try {
        const currentStatus = useCallStore.getState().status;
        const hasCallInProgress =
          activeSession !== null ||
          currentStatus === 'active' ||
          currentStatus === 'incoming' ||
          currentStatus === 'connecting';

        const userId = getAuthState().user?.id;
        if (!userAgent && userId && !hasCallInProgress) {
          console.log('[SIP] App active. Retrying SIP stack initialization...');
          await initSip(userId);
        } else if (userAgent) {
          if (!userAgent.isConnected() && !hasCallInProgress) {
            console.log(
              '[SIP] UserAgent transport disconnected. Reconnecting...',
            );
            await userAgent.reconnect();
          }
          if (
            registerer &&
            registerer.state !== RegistererState.Registered &&
            !hasCallInProgress
          ) {
            console.log('[SIP] Registerer not registered. Registering...');
            await registerer.register();
          }
        }
      } catch (err) {
        console.warn('[SIP] AppState change connection recovery failed:', err);
      }
    }
  };

  appStateListener = AppState.addEventListener('change', handleAppStateChange);
}

/** Tear down the active SIP stack (used when the signed-in user changes). */
export async function teardownSip(): Promise<void> {
  cancelIncomingCallDisplay();
  clearRingTimeout();
  declineUnsub?.();
  declineUnsub = null;
  initPromise = null;
  sipAccount = null;
  currentUserId = null;
  activeSession = null;
  activeSdh = null;
  stopForegroundService();
  callkeep.reset();
  appStateListener?.remove();
  appStateListener = null;
  try {
    await registerer?.dispose?.();
  } catch {
    // noop
  }
  registerer = null;
  try {
    await userAgent?.stop?.();
  } catch {
    // noop
  }
  userAgent = null;
}

/**
 * Dial `destination` (an E.164 number or SIP extension) through FreePBX.
 * Resolves with the SIP session id once the INVITE has been sent.
 */
export async function startOutgoingCall(
  destination: string,
  meta: { displayName?: string; photo?: string | null; isVideo?: boolean } = {},
): Promise<string> {
  await ensureSip();
  const number = normalizeNumber(destination);
  return placeCall(`sip:${number}@${sipAccount!.domain}`, number, meta);
}

/**
 * Wait until the callee's is_sip_active becomes true via WebSocket before sending SIP INVITE.
 */
function waitForCalleeSipActive(
  dbCallId: string | null,
  calleeUserId: string,
  timeoutMs = 30_000,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let cleanup: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const done = (err?: Error) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };

    // Check if user already cancelled in UI
    const currentStatus = useCallStore.getState().status;
    if (currentStatus === 'idle' || currentStatus === 'ended') {
      return done(new Error('Call cancelled.'));
    }

    timer = setTimeout(() => {
      console.warn(
        `[SIP] Timed out waiting for callee ${calleeUserId} to become SIP active.`,
      );
      stopOutgoingRingback();
      useCallStore.getState().setStatus('ended');
      useCallStore.getState().setError('User is unavailable.');
      done(new Error('User is unavailable.'));
    }, timeoutMs);

    // Fast polling fallback every 1.5s in case WebSocket drops or reconnects
    pollTimer = setInterval(async () => {
      try {
        const st = useCallStore.getState().status;
        if (st === 'idle' || st === 'ended') {
          return done(new Error('Call cancelled.'));
        }

        // 1. Check direct SIP presence via REST API
        const presence = await api.get<{ isOnline?: boolean; status?: string }>(
          `/sip/presence/${calleeUserId}`,
        );
        if (
          presence &&
          (presence.isOnline === true ||
            presence.status === 'ONLINE' ||
            presence.status === 'online')
        ) {
          console.log(
            `[SIP] Callee ${calleeUserId} polled SIP presence is online! Proceeding to send INVITE.`,
          );
          return done();
        }

        // 2. Check call record if dbCallId exists
        if (dbCallId) {
          const callData = await api.get<{
            status?: string;
            participants?: Array<{
              userId: string;
              isSipActive?: boolean;
              status?: string;
            }>;
          }>(`/sip/calls/${dbCallId}`);

          if (callData) {
            if (
              callData.status === 'ENDED' ||
              callData.status === 'CANCELLED' ||
              callData.status === 'REJECTED'
            ) {
              stopOutgoingRingback();
              useCallStore.getState().setStatus('ended');
              useCallStore.getState().setError('Call ended.');
              return done(new Error('Call ended.'));
            }

            const p = callData.participants?.find(
              cp => cp.userId === calleeUserId,
            );
            if (
              p &&
              (p.isSipActive ||
                p.status === 'ACCEPTED' ||
                p.status === 'accepted')
            ) {
              console.log(
                `[SIP] Callee ${calleeUserId} polled call participant is SIP active / accepted! Proceeding to send INVITE.`,
              );
              return done();
            }
          }
        }
      } catch {
        // Polling is best-effort fallback
      }
    }, 1500);

    cleanup = addCallWsListener((event, data) => {
      // Check if call was cancelled in the meantime

      console.log('[SIP] WebSocket event:', event, data);

      const st = useCallStore.getState().status;
      if (st === 'idle' || st === 'ended') {
        return done(new Error('Call cancelled.'));
      }

      // 1. Check for direct SIP presence update for callee
      if (event === 'sip_presence_updated' || event === 'presence_updated') {
        if (!data) return;
        const isTargetUser =
          data.userId === calleeUserId || data.id === calleeUserId;
        const isOnline =
          data.isOnline === true ||
          data.status === 'ONLINE' ||
          data.status === 'online';
        if (isTargetUser && isOnline) {
          console.log(
            `[SIP] Callee ${calleeUserId} presence updated to online / SIP active! Proceeding to send INVITE.`,
          );
          return done();
        }
      }

      if (
        event === 'call_updated' ||
        event === 'participant_updated' ||
        event === 'call_created'
      ) {
        if (!data) return;

        // Check if event belongs to this call
        const isMatchingCall =
          !dbCallId || data.id === dbCallId || data.callId === dbCallId;
        if (!isMatchingCall) return;

        // Check if call was ended remotely
        if (
          data.status === 'ENDED' ||
          data.status === 'CANCELLED' ||
          data.status === 'REJECTED'
        ) {
          stopOutgoingRingback();
          useCallStore.getState().setStatus('ended');
          useCallStore.getState().setError('Call ended.');
          return done(new Error('Call ended.'));
        }

        // Check participants in call data
        if (Array.isArray(data.participants)) {
          const participant = data.participants.find(
            (p: any) => p.userId === calleeUserId,
          );
          if (
            participant &&
            (participant.isSipActive ||
              participant.is_sip_active ||
              participant.status === 'ACCEPTED' ||
              participant.status === 'accepted')
          ) {
            console.log(
              `[SIP] Callee ${calleeUserId} is now SIP active / accepted! Proceeding to send INVITE.`,
            );
            return done();
          }
        }

        // Check direct participant payload or participant update event
        const isTargetParticipant =
          data.userId === calleeUserId ||
          data.updatedParticipantUserId === calleeUserId ||
          data.participant?.userId === calleeUserId;

        const isParticipantActive =
          data.isSipActive ||
          data.is_sip_active ||
          data.status === 'ACCEPTED' ||
          data.status === 'accepted' ||
          data.participant?.isSipActive ||
          data.participant?.is_sip_active ||
          data.participant?.status === 'ACCEPTED' ||
          data.participant?.status === 'accepted';

        if (isTargetParticipant && isParticipantActive) {
          console.log(
            `[SIP] Callee ${calleeUserId} participant updated to SIP active / accepted! Proceeding to send INVITE.`,
          );
          return done();
        }
      }
    });
  });
}

/**
 * Dial another app user by their user id (app-to-app VoIP).
 * Inserts the Call into the database, notifies the callee via push,
 * waits for the callee's is_sip_active to be true via WebSocket, and then sends the SIP INVITE.
 */
export async function startOutgoingCallToUser(
  userId: string,
  meta: {
    displayName?: string;
    photo?: string | null;
    conversationId?: string | null;
    isVideo?: boolean;
  } = {},
): Promise<string> {
  await ensureSip();

  const loggedInUserId = getAuthState().user?.id;
  if (!userId || userId === loggedInUserId) {
    throw new Error('Invalid call recipient. Cannot call yourself.');
  }

  if (loggedInUserId) {
    ensureCallWs(loggedInUserId);
  }

  const isVideo = !!meta.isVideo;

  // Update UI state immediately so Caller navigates to CallScreen without waiting for the delay
  useCallStore.getState().setCall({
    callId: null,
    destination: userId,
    displayName: meta.displayName ?? 'Calling...',
    photo: meta.photo ?? null,
    conversationId: meta.conversationId ?? null,
  });
  useCallStore.getState().setIsVideo(isVideo);
  useCallStore.getState().setVideoEnabled(isVideo);
  useCallStore.getState().setCameraFacing('user');
  useCallStore.getState().setStatus('connecting');
  useCallStore.getState().setError(null);

  // Play a distinct ringback sound during connecting mode
  startOutgoingRingback();

  // Ensure the callee's PBX extension exists
  const { extension } = await ensurePbxUser(userId);

  // Create / insert call record in database first (supports multi-user tracking & SIP presence check)
  let dbCallId: string | null = null;
  let isCalleeSipActive = false;

  try {
    const callRes = await api.post<{
      id: string;
      participants?: Array<{ userId: string; isSipActive: boolean }>;
    }>('/sip/calls', {
      hostId: currentUserId,
      calleeUserIds: [userId],
      isVideo,
      conversationId: meta.conversationId ?? undefined,
    });
    if (callRes?.id) {
      dbCallId = callRes.id;
      useCallStore.getState().setCall({ dbCallId });
    }
    const calleeParticipant = callRes?.participants?.find(
      p => p.userId === userId,
    );
    if (calleeParticipant?.isSipActive) {
      isCalleeSipActive = true;
    }
  } catch (err) {
    console.warn('[SIP] Failed to insert call in database:', err);
  }

  // Notify backend so the callee receives a wake-up push.
  const currentUser = getAuthState().user;
  const callerName =
    currentUser?.name || currentUser?.email || sipAccount?.username || 'Caller';

  try {
    await api.post('/sip/notify-incoming-call-by-user', {
      calleeUserId: userId,
      callerId: sipAccount!.username,
      callerName,
      isVideo,
    });
  } catch {
    // Best-effort; call connectivity does not depend on the webhook.
  }

  // Wait until the callee's is_sip_active is true on the WebSocket before sending the INVITE
  if (!isCalleeSipActive) {
    console.log(
      `[SIP] Callee ${userId} is not SIP active yet. Waiting for WebSocket is_sip_active=true...`,
    );
    await waitForCalleeSipActive(dbCallId, userId);
  }

  console.log(
    `[SIP] Callee ${userId} is already SIP active. Proceeding with INVITE.`,
  );

  const targetUri = `sip:${extension}@${sipAccount!.domain}`;

  const currentStatus = useCallStore.getState().status;
  if (currentStatus === 'idle' || currentStatus === 'ended') {
    stopOutgoingRingback();
    throw new Error('Call cancelled.');
  }

  return placeCall(targetUri, userId, meta);
}

/** Shared INVITE + call-store plumbing used by direct dial helpers. */
export function placeCall(
  targetUri: string,
  destinationLabel: string,
  meta: {
    displayName?: string;
    photo?: string | null;
    conversationId?: string | null;
    isVideo?: boolean;
  } = {},
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (!userAgent || !sipAccount) {
      stopOutgoingRingback();
      return reject(new Error('SIP is not ready yet. Please try again.'));
    }

    const currentStatus = useCallStore.getState().status;
    if (currentStatus === 'idle' || currentStatus === 'ended') {
      stopOutgoingRingback();
      return reject(new Error('Call cancelled.'));
    }

    const target = UserAgent.makeURI(targetUri);
    if (!target) {
      stopOutgoingRingback();
      return reject(new Error(`Invalid destination: ${destinationLabel}`));
    }

    const isVideo = !!meta.isVideo;
    const extraHeaders = isVideo ? ['X-Is-Video: true'] : [];

    let isSettled = false;
    let callStartTime: number | null = null;
    let wasPlaced = false;

    const inviter = new Inviter(userAgent, target, {
      extraHeaders,
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: isVideo },
      },
    });
    activeSession = inviter;

    useCallStore.getState().setCall({
      callId: inviter.id,
      destination: destinationLabel,
      displayName: meta.displayName ?? destinationLabel,
      photo: meta.photo ?? null,
      conversationId: meta.conversationId ?? null,
    });
    useCallStore.getState().setStatus('calling');
    useCallStore.getState().setError(null);

    startForegroundService('Solar Installation Management System', 'In call');

    inviter.stateChange.addListener((state: SessionState) => {
      const status = mapSessionState(state);
      if (status === 'connecting') {
        wasPlaced = true;
        startOutgoingRingback();
        if (IS_IOS) {
          callkeep.startOutgoingCall(
            destinationLabel,
            meta.displayName ?? destinationLabel,
            isVideo,
          );
        }
      }
      if (status === 'active') {
        if (!isSettled) {
          isSettled = true;
          resolve(inviter.id);
        }
        stopOutgoingRingback();
        startInCallManager(isVideo);
        callStartTime = Date.now();
        if (IS_IOS) callkeep.reportOutgoingConnected();

        const currentDbCallId = useCallStore.getState().call.dbCallId;
        if (currentDbCallId) {
          api
            .patch(`/sip/calls/${currentDbCallId}/status`, {
              status: 'ACTIVE',
            })
            .catch(() => {});
        }
      }
      if (status === 'ended') stopOutgoingRingback();

      useCallStore.getState().setStatus(status);

      if (state === SessionState.Terminated) {
        const duration = callStartTime
          ? Math.round((Date.now() - callStartTime) / 1000)
          : 0;
        const isCompleted = callStartTime !== null;
        callStartTime = null;

        const currentDbCallId = useCallStore.getState().call.dbCallId;
        if (currentDbCallId) {
          api
            .patch(`/sip/calls/${currentDbCallId}/status`, {
              status: isCompleted ? 'ENDED' : 'MISSED',
              duration,
            })
            .catch(() => {});
        }

        if (wasPlaced && meta.conversationId) {
          const loggedInUserId = getAuthState().user?.id;
          if (loggedInUserId) {
            sendMessage({
              conversationId: meta.conversationId,
              senderId: loggedInUserId,
              content: JSON.stringify({
                type: 'call_log',
                status: isCompleted ? 'completed' : 'missed',
                duration,
              }),
            }).catch(() => {});
          }
        }

        tearDownActiveSession(inviter);
      }
    });

    console.warn(`[SIP] Outgoing INVITE callId: ${inviter.id}`);

    inviter
      .invite({
        requestOptions: {
          extraHeaders,
        },
        requestDelegate: {
          onTrying: _response => {
            console.log('[SIP] onTrying', _response);
          },
          onProgress: _response => {
            // 180 Ringing or 183 Session Progress — callee is online & ringing!
            startOutgoingRingback('_DTMF_');
            if (!isSettled) {
              isSettled = true;
              resolve(inviter.id);
            }
          },
          onAccept: _response => {
            // 200 OK — call answered
            if (!isSettled) {
              isSettled = true;
              resolve(inviter.id);
            }
          },
          onReject: response => {
            const code = response.message.statusCode;
            console.warn(`[SIP] Outgoing INVITE rejected with status ${code}`);
            stopOutgoingRingback();

            const isUserDecline = code === 486 || code === 603;
            useCallStore.getState().setStatus('ended');
            useCallStore
              .getState()
              .setError(
                isUserDecline ? 'Call declined' : 'User is unavailable.',
              );

            if (!isSettled) {
              isSettled = true;
              reject(
                new Error(
                  isUserDecline ? 'Call declined' : 'User is unavailable.',
                ),
              );
            }
          },
        },
      })
      .catch(err => {
        console.warn('[SIP] inviter.invite failed:', err);
        stopOutgoingRingback();
        useCallStore.getState().setStatus('ended');
        useCallStore
          .getState()
          .setError(
            err instanceof Error ? err.message : 'Could not start the call.',
          );
        if (!isSettled) {
          isSettled = true;
          reject(err);
        }
      });
  });
}

/** End the active call (reject if still incoming, otherwise BYE). */
export async function hangupActiveCall(): Promise<void> {
  cancelIncomingCallDisplay();
  clearRingTimeout();
  clearAutoAnswerTimers();
  pendingAutoAnswer = false;
  stopIncomingRingtone();
  stopOutgoingRingback();
  clearIncomingCallNotification();
  callkeep.endCurrentCall();
  const session = activeSession;
  if (!session) {
    useCallStore.getState().setStatus('ended');
    stopInCallManager();
    return;
  }

  try {
    if (
      session instanceof Invitation &&
      (session.state === SessionState.Initial ||
        session.state === SessionState.Establishing)
    ) {
      // Reject works in both Initial (before 180) and Establishing (after 180
      // Ringing) states. This fixes the bug where the callee could not decline
      // an incoming call after the 180 was sent.
      await session.reject();
    } else if (
      session instanceof Inviter &&
      (session.state === SessionState.Initial ||
        session.state === SessionState.Establishing)
    ) {
      await session.cancel();
    } else if (session.state !== SessionState.Terminated) {
      await session.bye();
    }
  } catch {
    // Fall through — we tear down local state regardless.
  }

  tearDownActiveSession(session);
  useCallStore.getState().setStatus('ended');

  // Complete any pending VoIP push now that the call is over.
  const activeUuid = callkeep.getCallUUID();
  if (activeUuid) completeVoipPush(activeUuid);
}

/** Accept the current incoming call. */
export async function answerActiveCall(): Promise<void> {
  // Guard against re-entrancy. On iOS we dismiss the CallKit incoming-call
  // presentation by fulfilling the pending answer action
  // (RNCallKeep.answerIncomingCall), which in turn emits an 'answerCall'
  // event and re-enters here through the CallKit handler while the first
  // accept is still in flight.
  if (isAnsweringIncoming) {
    console.warn('[SIP] answerActiveCall already in progress — ignoring');
    return;
  }
  isAnsweringIncoming = true;
  try {
    await doAnswerActiveCall();
  } finally {
    isAnsweringIncoming = false;
  }
}

async function doAnswerActiveCall(): Promise<void> {
  console.warn('[SIP] answerActiveCall called 1', activeSession);
  const session = activeSession;

  // The incoming-call UI (CallKit or the in-app CallScreen) can be answered
  // before the SIP INVITE has actually arrived on the JS side — e.g. the
  // app was woken by the VoIP push while the SIP INVITE is still in flight,
  // or the WebSocket delivered call_created before the INVITE. In that window
  // `activeSession` is still `null`, so a hard `return` here would silently
  // drop the answer: no 200 OK is ever sent and the caller finally gives up
  // with "Call failed / User is unavailable".
  //
  // Instead we arm the pending-auto-answer flag: when the INVITE does arrive,
  // handleIncomingInvite immediately sends 200 OK without ringing further.
  if (!(session instanceof Invitation)) {
    if (activeSession === null) {
      console.warn(
        '[SIP] answerActiveCall: no Invitation yet — arming pending auto-answer',
      );
      cancelIncomingCallDisplay();
      // iOS: dismiss CallKit's ringing presentation immediately, even though
      // the SIP INVITE hasn't reached the JS stack yet. Fulfilling the answer
      // action stops the native ringtone / banner right away; the SIP accept
      // happens the moment the INVITE arrives (pendingAutoAnswer).
      if (IS_IOS) callkeep.answerIncomingCall();
      setPendingAutoAnswer(true);
    } else {
      // An outgoing call or a non-session is in progress; there is no
      // Invitation to accept.
      console.warn(
        '[SIP] answerActiveCall: no Invitation to accept, activeSession=',
        activeSession,
      );
    }
    return;
  }

  console.warn('[SIP] answerActiveCall called 2', activeSession);

  // Prevent double-answering if already established or terminating
  if (
    session.state === SessionState.Established ||
    session.state === SessionState.Terminating ||
    session.state === SessionState.Terminated
  ) {
    console.warn(
      `[SIP] answerActiveCall ignored: session already in state ${session.state}`,
    );
    useCallStore.getState().setStatus('active');
    return;
  }

  console.warn('[SIP] answerActiveCall called 3', activeSession);

  try {
    cancelIncomingCallDisplay();
    clearRingTimeout();
    stopIncomingRingtone();
    clearIncomingCallNotification();
    // iOS: the user answered from the in-app CallScreen — dismiss CallKit's
    // incoming-call presentation (ringing UI + ringtone). Fulfilling the
    // pending CXAnswerCallAction makes CallKit stop ringing and mark the call
    // connected; without this the native UI keeps ringing in the background
    // until the call times out.
    if (IS_IOS) callkeep.answerIncomingCall();
    const isVideo = useCallStore.getState().isVideo;
    console.warn('[SIP] answerActiveCall called 4', isVideo);
    // Ensure mic/camera permissions are granted on Android before WebRTC accepts
    await ensureRecordPermission();
    if (isVideo) {
      await ensureCameraPermission().catch(() => {});
    }
    console.warn('[SIP] answerActiveCall called 5', isVideo);

    if (
      session.state === SessionState.Initial ||
      session.state === SessionState.Establishing
    ) {
      console.warn('[SIP] answerActiveCall called 6', isVideo);
      await session.accept({
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: isVideo },
        },
      });
      console.warn('[SIP] answerActiveCall called 7', isVideo);
    }
    startInCallManager(isVideo);
    // startForegroundService('Solar Installation Management System', 'In call');
    useCallStore.getState().setStatus('active');
    console.warn('[SIP] answerActiveCall called 8', isVideo);

    // Complete any pending VoIP push now that the call is answered.
    const activeUuid = callkeep.getCallUUID();
    if (activeUuid) completeVoipPush(activeUuid);

    console.log('[SIP] answerActiveCall called 9');
  } catch (err) {
    console.error('[SIP] answerActiveCall failed:', err);
    // Only tear down if the session failed to establish and is not already active
    if ((session.state as SessionState) !== SessionState.Established) {
      useCallStore
        .getState()
        .setError(
          err instanceof Error ? err.message : 'Could not answer the call.',
        );
      useCallStore.getState().setStatus('ended');
      await hangupActiveCall();
    }
  }
}

/** Mute / unmute the active call's microphone. */
export async function setMuted(muted: boolean): Promise<void> {
  activeSdh?.setMuted(muted);
  if (IS_ANDROID) {
    try {
      InCallManager.setMicrophoneMute(muted);
    } catch {
      // noop
    }
  }
  if (IS_IOS) callkeep.setMuted(muted);
  useCallStore.getState().setMuted(muted);
}

/** Route audio through the speaker or the earpiece. */
export async function setSpeaker(speaker: boolean): Promise<void> {
  if (IS_ANDROID) {
    try {
      InCallManager.setForceSpeakerphoneOn(speaker);
    } catch {
      // noop
    }
  }
  if (IS_IOS) {
    callkeep.setSpeaker(speaker);
  }
  useCallStore.getState().setSpeaker(speaker);
}

/**
 * Enable/disable the outgoing video feed during a video call.
 * Disabling stops sending the camera track (the remote side sees a frozen /
 * blank video) while the call itself stays up.
 */
export async function setVideoEnabled(enabled: boolean): Promise<void> {
  activeSdh?.setVideoEnabled(enabled);
  useCallStore.getState().setVideoEnabled(enabled);
}

/** Switch between the front and rear camera during a video call. */
export async function flipCamera(): Promise<void> {
  activeSdh?.flipCamera();
}

/**
 * Request the permissions needed for a video call (camera + microphone)
 * UP FRONT — call this when the user taps the video-call button, before any
 * SIP negotiation starts, so the OS prompt appears immediately and the call
 * can be aborted cleanly if the user declines.
 *
 * - Android: explicit runtime requests via PermissionsAndroid.
 * - iOS: react-native-webrtc's getUserMedia triggers the native prompt; we
 *   acquire a throwaway stream to surface the prompt, then release it.
 *
 * Returns `true` only when both camera and microphone are granted.
 */
export async function requestVideoCallPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      await ensureRecordPermission();
      await ensureCameraPermission();
      return true;
    } catch {
      return false;
    }
  }

  // iOS: getUserMedia({audio, video}) triggers the native camera + mic prompts.
  try {
    const probe = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: useCallStore.getState().cameraFacing,
      },
    });
    for (const track of probe.getTracks()) {
      try {
        track.stop();
      } catch {
        // noop
      }
    }
    try {
      probe.release?.();
    } catch {
      // noop
    }
    return true;
  } catch {
    return false;
  }
}
