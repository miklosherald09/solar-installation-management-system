/**
 * CallKit bridge (iOS).
 *
 * Wraps react-native-callkeep to provide a clean, platform-safe interface
 * for the rest of the app. On Android every call is a no-op so callers
 * never need Platform.OS guards.
 *
 * ── iOS CallKit lifecycle (industry standard) ────────────────────────
 *
 * INCOMING (cold-start / killed state):
 *   1. APNs VoIP push → AppDelegate.didReceiveIncomingPushWith
 *   2. RNCallKeep.reportNewIncomingCall() called immediately (< 0.5 s)
 *   3. CallKit shows full-screen incoming-call UI with slide-to-answer
 *   4. User slides to answer → 'answerCall' event → onAnswer handler
 *   5. JS SIP stack answers the INVITE → two-way audio starts
 *   6. User taps End → 'endCall' event → onEnd handler → SIP BYE
 *
 * INCOMING (background / foreground):
 *   1. SIP INVITE arrives while app is running
 *   2. handleIncomingInvite → displayIncomingCall(uuid, handle, name)
 *   3. CallKit rings (same UI as above)
 *   4. Same answer/end flow as cold-start
 *
 * OUTGOING:
 *   1. User initiates call → startOutgoingCall(uuid, handle, name)
 *   2. CallKit shows "calling…" UI
 *   3. INVITE sent → Provisional response → 200 OK
 *   4. reportOutgoingConnected() → CallKit shows connected UI
 *   5. endCurrentCall() → CallKit dismisses → SIP BYE
 */

import { Platform } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import type { EventsPayload } from 'react-native-callkeep';

const IS_IOS = Platform.OS === 'ios';

let isSetup = false;
/** Currently displayed CallKit call UUID, set when displayIncomingCall or
 *  reportIncomingCallFromPush is called; cleared on end/answer. */
let callUUID: string | null = null;

type AnswerHandler = () => void;
type EndHandler = () => void;
type MuteHandler = (muted: boolean) => void;

interface CallKeepHandlers {
  onAnswer: AnswerHandler;
  onEnd: EndHandler;
  onMute: MuteHandler;
}

let handlers: CallKeepHandlers | null = null;

// ── UUID generation (RFC 4122 v4, no external deps) ──────────────────

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Event listeners (registered once at setup) ───────────────────────

let pendingAnswer = false;
let pendingEnd = false;

function registerListeners(): void {
  if (!IS_IOS) return;

  RNCallKeep.addEventListener(
    'answerCall',
    ({ callUUID: answeredUUID }: EventsPayload['answerCall']) => {
      callUUID = answeredUUID;
      if (handlers) {
        handlers.onAnswer();
      } else {
        pendingAnswer = true;
      }
    },
  );

  RNCallKeep.addEventListener(
    'endCall',
    ({ callUUID: endedUUID }: EventsPayload['endCall']) => {
      if (callUUID === endedUUID) callUUID = null;
      if (handlers) {
        handlers.onEnd();
      } else {
        pendingEnd = true;
      }
    },
  );

  RNCallKeep.addEventListener(
    'didPerformSetMutedCallAction',
    ({ muted }: EventsPayload['didPerformSetMutedCallAction']) => {
      handlers?.onMute(muted);
    },
  );
}

// ── Public API ────────────────────────────────────────────────────────

/** Register CallKit answer/end/mute callbacks. Call once at app init. */
export function setCallKeepHandlers(h: CallKeepHandlers): void {
  handlers = h;
  if (pendingAnswer) {
    pendingAnswer = false;
    handlers.onAnswer();
  }
  if (pendingEnd) {
    pendingEnd = false;
    handlers.onEnd();
  }
}

/** One-time setup: configure CallKit + register event listeners. */
export function setupCallKeep(): void {
  if (!IS_IOS || isSetup) return;
  isSetup = true;

  const options = {
    ios: {
      appName: 'Solar Installation Management System',
      supportsVideo: true,
      maximumCallGroups: '1',
      maximumCallsPerCallGroup: '1',
      includesCallsInRecents: true,
    },
    android: {
      alertTitle: 'Permissions required',
      alertDescription: 'This app needs permissions for calling.',
      cancelButton: 'Cancel',
      okButton: 'OK',
      additionalPermissions: [],
    },
  };
  try {
    RNCallKeep.setup(options);
  } catch (e) {
    console.warn('[CallKeep] setup failed:', e);
  }

  registerListeners();
}

/** Show the native iOS incoming-call UI for a SIP INVITE received while the
 *  app is already running (foreground or background). Returns the call UUID.
 *  `hasVideo` advertises video call controls in CallKit. */
export function displayIncomingCall(
  handle: string,
  callerName: string,
  hasVideo = false,
): string | null {
  if (!IS_IOS) return null;
  const uuid = uuidv4();
  callUUID = uuid;
  try {
    RNCallKeep.displayIncomingCall(uuid, handle, callerName, 'generic', hasVideo);
  } catch (e) {
    console.warn('[CallKeep] displayIncomingCall failed:', e);
    callUUID = null;
    return null;
  }
  return uuid;
}

/** Report a new incoming call *natively* — used by the VoIP-push path where
 *  the AppDelegate already reported to CallKit via reportNewIncomingCall.
 *  Stores the UUID so the JS stack knows a call is already ringing. */
export function reportIncomingCallFromPush(pushUUID: string): void {
  if (!IS_IOS) return;
  callUUID = pushUUID;
}

/** Whether a CallKit call is currently being displayed/active. */
export function hasActiveCall(): boolean {
  return IS_IOS && callUUID !== null;
}

/** Get the current CallKit call UUID (null if no active call). */
export function getCallUUID(): string | null {
  return IS_IOS ? callUUID : null;
}

/** Programmatically answer the current CallKit incoming call (in-app button). */
export function answerIncomingCall(): void {
  if (!IS_IOS || !callUUID) return;
  try {
    RNCallKeep.answerIncomingCall(callUUID);
  } catch {
    // may error if already answered — safe to ignore
  }
}

/** End the current CallKit call (decline or hangup). */
export function endCurrentCall(): void {
  if (!IS_IOS || !callUUID) return;
  try {
    RNCallKeep.endCall(callUUID);
  } catch {
    // noop
  }
  callUUID = null;
}

/** Report that the outgoing call is now connecting (CallKit shows "calling…"). */
export function startOutgoingCall(
  handle: string,
  displayName: string,
  hasVideo = false,
): string | null {
  if (!IS_IOS) return null;
  const uuid = uuidv4();
  callUUID = uuid;
  try {
    RNCallKeep.startCall(uuid, handle, displayName, 'generic', hasVideo);
  } catch (e) {
    console.warn('[CallKeep] startCall failed:', e);
    callUUID = null;
    return null;
  }
  return uuid;
}

/** Report that the outgoing call is now connected (two-way audio). */
export function reportOutgoingConnected(): void {
  if (!IS_IOS || !callUUID) return;
  try {
    RNCallKeep.reportConnectedOutgoingCallWithUUID(callUUID);
  } catch {
    // noop
  }
}

/** Sync mute state to CallKit UI (in-app mute button). */
export function setMuted(muted: boolean): void {
  if (!IS_IOS || !callUUID) return;
  try {
    RNCallKeep.setMutedCall(callUUID, muted);
  } catch {
    // noop
  }
}

/** Route audio to speaker or receiver. */
export function setSpeaker(speaker: boolean): void {
  if (!IS_IOS || !callUUID) return;
  try {
    RNCallKeep.setAudioRoute(callUUID, speaker ? 'Speaker' : 'Receiver');
  } catch {
    // noop
  }
}

/** Clean up — reset state (used on sign-out / session teardown). */
export function reset(): void {
  callUUID = null;
}
