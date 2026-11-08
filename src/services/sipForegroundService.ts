/**
 * Thin JS wrapper around the native `SipCall` module (Android).
 *
 * The native module owns a foreground service that keeps the SIP WebSocket
 * alive while the app is backgrounded, plus a full-screen "Incoming call"
 * notification for background/cold-start wake.
 *
 * Every method is a best-effort no-op when the native module isn't linked
 * (e.g. iOS, or during JS-only dev) so callers never have to guard.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';

export interface SipCallIntentData {
  incomingCall: boolean;
  answerCall?: boolean;
  callerId: string;
  callerName: string;
  isVideo?: boolean;
}

interface SipCallNativeModule {
  startForegroundService(title?: string, text?: string): void;
  stopForegroundService(): void;
  showIncomingCall(callerId: string, displayName: string, isVideo?: boolean): void;
  clearIncomingCall(): void;
  getAndClearIncomingCallIntent(): Promise<SipCallIntentData | null>;
  setLoginState(isLoggedIn: boolean): void;
}

const native = NativeModules.SipCall as SipCallNativeModule | undefined;

/** Event emitter for native "sipDeclineCall" / "sipCallIntent" events (Android only). */
let eventEmitter: NativeEventEmitter | null = null;
let declineSubscription: { remove: () => void } | null = null;

/** Register a callback that fires when the user presses "Decline" on the
 *  Android incoming-call notification. Returns an unsubscribe function. */
export function onNativeDecline(handler: () => void): () => void {
  if (!IS_ANDROID || !native) return () => {};

  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(native as any);
  }

  declineSubscription?.remove();
  declineSubscription = eventEmitter.addListener('sipDeclineCall', handler);

  return () => {
    declineSubscription?.remove();
    declineSubscription = null;
  };
}

/** Register a callback for incoming call intents received while the app is running / resumed. */
export function onNativeCallIntent(
  handler: (data: SipCallIntentData) => void,
): () => void {
  if (!IS_ANDROID || !native) return () => {};

  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(native as any);
  }

  const sub = eventEmitter.addListener('sipCallIntent', handler);
  return () => {
    sub.remove();
  };
}

/** Start the foreground service that keeps the app/SIP stack alive. */
export function startForegroundService(title?: string, text?: string): void {
  try {
    native?.startForegroundService(title, text);
  } catch {
    // noop
  }
}


/** Stop the foreground service (sign-out / SIP teardown). */
export function stopForegroundService(): void {
  try {
    native?.stopForegroundService();
  } catch {
    // noop
  }
}

/** Post a high-priority, full-screen "Incoming call" notification. */
export function showIncomingCallNotification(
  callerId: string,
  displayName: string,
  isVideo: boolean = false,
): void {
  try {
    native?.showIncomingCall(callerId, displayName, isVideo);
  } catch {
    // noop
  }
}

/** Dismiss the incoming-call notification. */
export function clearIncomingCallNotification(): void {
  try {
    native?.clearIncomingCall();
  } catch {
    // noop
  }
}

/**
 * Check whether the current Activity was launched from a full-screen
 * incoming-call notification. Call this early (e.g. in App.tsx on mount)
 * to recover the caller info that was lost during a cold start.
 *
 * Returns { incomingCall: true, callerId, callerName } when the intent
 * extras were present, or null otherwise. The extras are consumed on the
 * native side so a second call will return null.
 */
export async function getAndClearIncomingCallIntent(): Promise<SipCallIntentData | null> {
  try {
    if (!native) return null;
    return await native.getAndClearIncomingCallIntent();
  } catch {
    return null;
  }
}

/** Synchronize the login state to SharedPreferences natively. */
export function setLoginState(isLoggedIn: boolean): void {
  try {
    native?.setLoginState(isLoggedIn);
  } catch {
    // noop
  }
}
