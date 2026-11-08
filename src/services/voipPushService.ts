/**
 * Background / quit-state VoIP wake handler.
 *
 * Android: FCM data message → foreground service + full-screen notification
 *          (native CustomFirebaseMessagingService already shows the
 *          notification; this JS handler only initialises SIP so the INVITE
 *          can be received).
 *
 * iOS:     PushKit VoIP push → CallKit native UI (AppDelegate) + this JS
 *          handler re-registers SIP so the INVITE is delivered.
 *
 *  ── iOS cold-start (industry-standard) flow ──────────────────────────
 *   1. Backend sends APNs VoIP push (pushType = "voip", priority 10,
 *      topic = bundleId.voip) with callerId, callerName, uuid, isVideo.
 *   2. iOS delivers push to PKPushRegistry → didReceiveIncomingPushWith.
 *   3. AppDelegate extracts caller data, configures AVAudioSession
 *      (.voiceChat), then calls reportNewIncomingCall IMMEDIATELY
 *      (iOS 13+ killer requirement — app is terminated if >0.5 s).
 *   4. CallKit shows the native full-screen incoming-call UI
 *      (caller name, video/audio buttons, slide-to-answer).
 *   5. A 10-second completion timeout is armed as a safety net; JS
 *      normally calls onVoipNotificationCompleted sooner.
 *   6. The JS bridge loads → setupVoipPush() registers event listeners.
 *   7. Cached push events are replayed via didLoadWithEvents
 *      (if push arrived before the bridge was ready).
 *   8. SIP stack initialises → REGISTER to FreePBX → INVITE arrives.
 *   9. handleIncomingInvite checks if CallKit already has a call:
 *      - If YES → don't double-display, just sync state.
 *      - If NO  → displayIncomingCall() (foreground/background wake).
 *  10. User answers/declines → completeVoipPush(uuid) releases the
 *      completion handler early; otherwise the 10-second JS timeout
 *      fires (scheduleVoipPushCompletion).
 *
 * The SIP INVITE itself reaches the device once Asterisk sees the REGISTER,
 * which happens when the app wakes and initSip runs.
 */

import { Platform } from 'react-native';
import * as callkeep from './callkeepService';

import { initAuthStore, getAuthState } from '../store/useAuthStore';
import { initSip } from './sipService';

const IS_IOS = Platform.OS === 'ios';

/** Android FCM data wake — start foreground service, init SIP, and defer the
 *  notification UI to the native CustomFirebaseMessagingService which already
 *  posts the full-screen incoming-call notification. */
export async function handleIncomingCallWake(
  data: Record<string, string>,
): Promise<void> {
  // Backend sends isVideo as "1"/"0" (FCM data-only string values)
  const isVideo = data.isVideo === 'true' || data.isVideo === '1';

  // Pre-set the video flag in the call store so that when the SIP INVITE
  // arrives and handleIncomingInvite fires, the fallback
  // `useCallStore.getState().isVideo` is already true — even if the SDP
  // body detection fails.  This ensures the callee's CallScreen shows
  // video controls immediately.
  if (isVideo) {
    const { useCallStore } = require('../store/useCallStore');
    useCallStore.getState().setIsVideo(true);
    useCallStore.getState().setVideoEnabled(true);
  }

  // ── Android & iOS ───────────────────────────────────────────────────
  // Native CustomFirebaseMessagingService (Android) or PushKit (iOS)
  // already started the foreground service and posted the call notification.
  // Initialise SIP so the callee registers to FreePBX and receives the INVITE.
  try {
    await initAuthStore();
    const user = getAuthState().user;
    if (user?.id) {
      console.log('[VoIP Wake] Initializing SIP stack for callee:', user.id);
      await initSip(user.id);
    }
  } catch (err) {
    console.warn('[VoIP Wake] failed to initialize SIP stack:', err);
  }
}

/**
 * Register PushKit VoIP push on iOS.
 * Call once at app startup (handles both cold-start cached events and
 * foreground registration).
 *
 * On iOS the AppDelegate natively reports incoming pushes to CallKit via
 * `RNCallKeep.reportNewIncomingCall`. This JS handler stores the push's
 * UUID so that when the INVITE arrives (a few seconds later after
 * re-REGISTER) we don't double-display.
 *
 * Push completion timing: the VoIP push completion is called after a
 * 10-second grace window or immediately via completeVoipPush() when the
 * SIP INVITE is answered/declined — whichever happens first. This keeps the
 * background thread alive long enough for Asterisk to deliver the INVITE
 * without running the entire 10 s every time.
 */
import VoipPushNotification from 'react-native-voip-push-notification';
import { api } from './api';
import { getDeviceId } from './deviceIdentity';

let voipToken: string | null = null;

/** Active push UUIDs awaiting completion. When an INVITE arrives for one of
 *  these we immediately complete the push instead of waiting for the timer. */
const pendingVoipUuids = new Set<string>();

export function getVoipToken(): string | null {
  return voipToken;
}

/** Call this from the SIP service when a call is answered or declined so the
 *  VoIP push is completed immediately — no need to keep the background thread
 *  alive after the call outcome is already known. */
export function completeVoipPush(uuid: string): void {
  if (!IS_IOS || !uuid) return;
  if (!pendingVoipUuids.has(uuid)) return;
  pendingVoipUuids.delete(uuid);
  VoipPushNotification.onVoipNotificationCompleted(uuid);
}

/**
 * iOS safety net for a late VoIP-push replay.
 *
 * If the user answered/declined from the in-app CallScreen BEFORE the RN
 * bridge learned this push's UUID, `callkeep.answerIncomingCall()` had no UUID
 * to target and CallKit kept ringing the now-stale call. Once the push event
 * lands we know the UUID, so we fulfil the pending answer/end action to make
 * the native call notification + ringing disappear immediately.
 */
function dismissStaleCallKitRing(uuid: string): void {
  if (!IS_IOS || !uuid) return;
  const { useCallStore } = require('../store/useCallStore');
  const status = useCallStore.getState().status;
  if (status === 'ended') {
    callkeep.endCurrentCall();
    completeVoipPush(uuid);
  } else if (status === 'active') {
    callkeep.answerIncomingCall();
    completeVoipPush(uuid);
  }
}

/** Standard push grace window (ms). If the INVITE doesn't arrive within this
 *  window we complete the push anyway so iOS doesn't terminate us. */
const PUSH_GRACE_MS = 10_000;

function scheduleVoipPushCompletion(uuid: string): void {
  if (!uuid) return;
  pendingVoipUuids.add(uuid);
  // Safety: complete after grace period regardless of INVITE outcome
  setTimeout(() => {
    if (pendingVoipUuids.has(uuid)) {
      pendingVoipUuids.delete(uuid);
      VoipPushNotification.onVoipNotificationCompleted(uuid);
    }
  }, PUSH_GRACE_MS);
}

/** POST the VoIP token to backend. Called whenever the token (re)generates. */
async function registerVoipTokenWithBackend(
  userId: string,
  token: string,
): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await api.post('/notifications/voip-register', {
      userId,
      deviceId,
      token,
      platform: 'ios',
    });
    console.log('[VoIP Push] Token registered with backend');
  } catch (err) {
    console.warn('[VoIP Push] Backend registration failed:', err);
  }
}

export function setupVoipPush(userId: string): void {
  if (!IS_IOS) return;

  // Event: VoIP token generated (send to backend).
  VoipPushNotification.addEventListener('register', (token: string) => {
    voipToken = token;
    console.log('[VoIP Push] Token:', token);
    registerVoipTokenWithBackend(userId, token);
  });

  // Event: VoIP push received while app is running (not cold-start).
  // The native AppDelegate already reported to CallKit — we just note
  // the UUID so the INVITE handler doesn't double-display.
  VoipPushNotification.addEventListener('notification', (payload: any) => {
    const uuid = payload?.uuid || '';
    if (uuid) {
      callkeep.reportIncomingCallFromPush(uuid);
      // If the user already answered/declined from the in-app UI while this
      // push UUID was still in flight, CallKit may still be ringing the stale
      // call — dismiss it now that we know the UUID.
      dismissStaleCallKitRing(uuid);
    }

    // Pre-set the video flag so the CallScreen knows this is a video call
    // before the SIP INVITE arrives and the SDP is parsed.
    const pushIsVideo =
      payload?.isVideo === true ||
      payload?.isVideo === 'true' ||
      payload?.isVideo === '1';
    if (pushIsVideo) {
      const { useCallStore } = require('../store/useCallStore');
      useCallStore.getState().setIsVideo(true);
      useCallStore.getState().setVideoEnabled(true);
    }

    // Schedule push completion (completed early via completeVoipPush when
    // the INVITE is answered/declined, or after the grace period).
    scheduleVoipPushCompletion(uuid);

    // Load user and initialize SIP stack so the background thread registers
    // and receives the INVITE
    initAuthStore()
      .then(() => {
        const user = getAuthState().user;
        if (user?.id) {
          return initSip(user.id);
        }
      })
      .catch(err => {
        console.warn(
          '[VoIP Push background] failed to initialize SIP stack:',
          err,
        );
      });
  });

  // Replay cached events (push arrived before JS bridge was ready).
  VoipPushNotification.addEventListener(
    'didLoadWithEvents',
    (events: any[]) => {
      if (!events || !Array.isArray(events)) return;
      for (const event of events) {
        const { name, data } = event;
        if (
          name ===
          VoipPushNotification.RNVoipPushRemoteNotificationsRegisteredEvent
        ) {
          voipToken = data as string;
          registerVoipTokenWithBackend(userId, voipToken);
        } else if (
          name ===
          VoipPushNotification.RNVoipPushRemoteNotificationReceivedEvent
        ) {
          const payload = data as any;
          const uuid = payload?.uuid || '';
          if (uuid) {
            callkeep.reportIncomingCallFromPush(uuid);
            // Same late-push safety net as the foreground notification event.
            dismissStaleCallKitRing(uuid);
          }

          // Pre-set video flag from cached push payload
          const pushIsVideo =
            payload?.isVideo === true ||
            payload?.isVideo === 'true' ||
            payload?.isVideo === '1';
          if (pushIsVideo) {
            const { useCallStore } = require('../store/useCallStore');
            useCallStore.getState().setIsVideo(true);
            useCallStore.getState().setVideoEnabled(true);
          }

          scheduleVoipPushCompletion(uuid);

          initAuthStore()
            .then(() => {
              const user = getAuthState().user;
              if (user?.id) {
                return initSip(user.id);
              }
            })
            .catch(err => {
              console.warn(
                '[VoIP Push background didLoad] failed to initialize SIP stack:',
                err,
              );
            });
        }
      }
    },
  );

  VoipPushNotification.registerVoipToken();
}
