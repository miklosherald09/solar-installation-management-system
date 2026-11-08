/**
 * Push Notification Service
 * Handles FCM token registration, permission requests,
 * foreground/background notification display, and tap-to-navigate.
 */

import { Platform } from 'react-native';
import { api } from './api';
import { getDeviceId } from './deviceIdentity';
import { playNotificationSound } from './soundService';

// ---------------------------------------------------------------------------
// Firebase messaging placeholder — the native module is imported lazily so
// the app still works when Firebase isn't linked yet (during initial dev).
// Once @react-native-firebase/app and @react-native-firebase/messaging are
// installed, these imports will resolve.
//
// There is deliberately no JS-side firebaseConfig here: the default app is
// auto-initialized natively from android/app/google-services.json and
// ios/GoogleService-Info.plist. Duplicating that config in JS drifts from the
// native files and cannot be right for both platforms at once (the Android and
// iOS appIds differ).
// ---------------------------------------------------------------------------

let _messagingPromise: Promise<any> | null = null;

async function _getMessaging() {
  if (!_messagingPromise) {
    _messagingPromise = _resolveMessaging();
  }
  const result = await _messagingPromise;
  // If Firebase wasn't available (e.g. native modules not yet initialised on
  // iOS), reset the promise so the next call retries instead of permanently
  // caching null.  This is critical for the login flow: initForegroundListeners
  // is called on mount (before login) and may get null; when the user later
  // logs in, requestPushNotif must be able to retry and actually register the
  // device token.
  if (result === null) {
    _messagingPromise = null;
  }
  return result;
}

async function _resolveMessaging() {
  try {
    // Use Firebase Web modular SDK API (v22+)
    // Supports both named exports (`getApps`) and default export fallback
    const appModule = require('@react-native-firebase/app');
    const getApps =
      appModule.getApps ??
      appModule.default?.getApps ??
      (() => appModule.apps ?? appModule.default?.apps ?? []);

    const apps = getApps ? getApps() : [];

    if (apps.length === 0) {
      console.warn(
        '[PushNotifications] No Firebase app is initialized. Check that ' +
          'android/app/google-services.json and ios/GoogleService-Info.plist ' +
          'are present, and rebuild the app (a JS reload is not enough).',
      );
      return null;
    }

    // Obtain the Messaging factory function
    const msgModule = require('@react-native-firebase/messaging');
    const getMessaging =
      msgModule.getMessaging ??
      msgModule.default?.getMessaging ??
      msgModule.default ??
      msgModule;

    if (typeof getMessaging !== 'function') {
      console.warn(
        '[PushNotifications] getMessaging is not a function, using default export.',
      );
      return null;
    }

    // Return the factory function (callers invoke it as msg())
    return getMessaging;
  } catch (e) {
    console.warn(
      '[PushNotifications] @react-native-firebase/messaging not available:',
      e,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Permission & token registration
// ---------------------------------------------------------------------------

/**
 * Request push-notification permission and register the device token.
 *
 * Call this before critical actions (sending messages, creating works,
 * expressing interest) and after user registration.
 *
 * Always attempts the native OS permission dialog first (the OS decides
 * whether to actually show it — iOS shows it once, Android 13+ may show
 * it depending on user's prior choice).  Afterwards the FCM token is
 * registered with the backend.
 *
 * @returns `true` if the token was successfully registered (or permission
 *          was not required on this platform); `false` if the user denied
 *          the native dialog.
 */
export async function requestPushNotif(userId: string): Promise<boolean> {
  try {
    // -- Always request native OS permission (OS decides if dialog shows) --
    const granted = await _requestNativePermission();
    if (!granted) return false;

    // -- Register the FCM token with the backend --------------------------
    await registerDeviceTokenIfNeeded(userId);
    return true;
  } catch (error) {
    console.warn('[PushNotifications] requestPushNotif failed:', error);
    return false;
  }
}

/** Request native OS permission (without any priming popup). */
async function _requestNativePermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const msg = await _getMessaging();
    if (!msg) return false;
    const authStatus = await msg().requestPermission();
    return (
      authStatus === 1 /* AUTHORIZED */ || authStatus === 2 /* PROVISIONAL */
    );
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const { PermissionsAndroid } = require('react-native');
    const result = await PermissionsAndroid.request(
      'android.permission.POST_NOTIFICATIONS',
    );
    return result === 'granted';
  }

  // older Android (< 33): no runtime permission needed
  return true;
}

/** Only register if we haven't already registered for this user + device. */
async function registerDeviceTokenIfNeeded(userId: string): Promise<void> {
  try {
    await registerDeviceToken(userId);
  } catch (error) {
    console.warn(
      '[PushNotifications] registerDeviceTokenIfNeeded failed:',
      error,
    );
  }
}

/** Legacy — kept for backward-compatibility with App.tsx setup flow. */
export async function requestPermission(): Promise<boolean> {
  const msg = await _getMessaging();
  if (!msg) return false;

  if (Platform.OS === 'ios') {
    const authStatus = await msg().requestPermission();
    return (
      authStatus === 1 /* AUTHORIZED */ || authStatus === 2 /* PROVISIONAL */
    );
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const { PermissionsAndroid } = require('react-native');
    const result = await PermissionsAndroid.request(
      'android.permission.POST_NOTIFICATIONS',
    );
    return result === 'granted';
  }

  return true;
}

/** Get the FCM token and register it with the backend. */
export async function registerDeviceToken(userId: string): Promise<void> {
  const msg = await _getMessaging();

  if (!msg) return;

  try {
    console.log('Platform.OS', Platform.OS);
    const fcmToken = await msg().getToken();

    console.log('fcmTokenxx', fcmToken);
    if (!fcmToken) return;

    const deviceId = await getDeviceId();

    await api.post('/notifications/register', {
      userId,
      deviceId,
      token: fcmToken,
      platform: Platform.OS,
    });
    console.log('[PushNotifications] Token registered');
  } catch (error) {
    console.warn('[PushNotifications] Token registration failed:', error);
  }
}

/** Unregister the device token when the user signs out. */
export async function unregisterDeviceToken(userId: string): Promise<void> {
  const msg = await _getMessaging();
  if (!msg) return;

  try {
    const fcmToken = await msg().getToken();
    if (!fcmToken) return;
    await api.post('/notifications/unregister', { userId, token: fcmToken });
  } catch (error) {
    console.warn('[PushNotifications] Token unregister failed:', error);
  }
}

/**
 * Unregister this device entirely by its persistent identity.
 * Deletes all device_token rows for this device — called on logout.
 */
export async function unregisterDevice(userId: string): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await api.post('/notifications/unregister-device', { userId, deviceId });
    console.log('[PushNotifications] Device unregistered');
  } catch (error) {
    console.warn('[PushNotifications] Device unregister failed:', error);
  }
}

// ---------------------------------------------------------------------------
// Token refresh listener
// ---------------------------------------------------------------------------

let _unsubscribeTokenRefresh: (() => void) | null = null;

export async function listenForTokenRefresh(
  getUserId: () => string | undefined,
): Promise<void> {
  const msg = await _getMessaging();
  if (!msg) return;

  _unsubscribeTokenRefresh?.();
  _unsubscribeTokenRefresh = msg().onTokenRefresh(async (fcmToken: string) => {
    const userId = getUserId();
    if (!userId) return;
    try {
      const deviceId = await getDeviceId();
      await api.post('/notifications/register', {
        userId,
        deviceId,
        token: fcmToken,
        platform: Platform.OS,
      });
    } catch (error) {
      console.warn('[PushNotifications] Token refresh failed:', error);
    }
  });
}

export function stopTokenRefreshListener(): void {
  _unsubscribeTokenRefresh?.();
  _unsubscribeTokenRefresh = null;
}

// ---------------------------------------------------------------------------
// Foreground notification handler
// ---------------------------------------------------------------------------

// Handler invoked when the user taps a push notification (from the OS tray /
// notification centre). The app uses it to navigate the user to the relevant
// screen — e.g. tapping "New work posted" redirects to the work detail page.
type NotificationTapHandler = (data: Record<string, string>) => void;

let _onNotificationTap: NotificationTapHandler | null = null;
let _pendingInitialNotificationData: Record<string, string> | null = null;
let _foregroundListenersInitialized = false;

export function setNotificationTapHandler(
  handler?: NotificationTapHandler,
): void {
  _onNotificationTap = handler ?? null;
  if (_onNotificationTap && _pendingInitialNotificationData) {
    const data = _pendingInitialNotificationData;
    _pendingInitialNotificationData = null;
    _onNotificationTap(data);
  }
}

/**
 * Route a tapped push notification to the registered tap handler so the app
 * can navigate the user to the associated content.
 *
 * "incoming_call" pushes are data-only and surface their own native call UI
 * (Android full-screen notification / iOS CallKit), so they are intentionally
 * skipped here to avoid a duplicate navigation.
 */
function handleOpenedNotification(remoteMessage: any): void {
  const { data } = remoteMessage;
  if (data?.type === 'incoming_call') return;
  if (!data) return;

  if (_onNotificationTap) {
    _onNotificationTap(data as Record<string, string>);
  } else {
    _pendingInitialNotificationData = data as Record<string, string>;
  }
}

export async function initForegroundListeners(): Promise<void> {
  const msg = await _getMessaging();
  if (!msg) return;

  if (!_foregroundListenersInitialized) {
    _foregroundListenersInitialized = true;

    msg().onMessage(async (remoteMessage: any) => {
      const { notification, data } = remoteMessage;

      // Incoming-call pushes are now data-only (no notification field), but guard
      // against any legacy message that still carries both fields by explicitly
      // suppressing the alert here. The native call UI (Android full-screen
      // notification / iOS CallKit) already handles the user-visible alert.
      if (data?.type === 'incoming_call') {
        return;
      }
      console.log(notification);

      // Play the chord notification sound for every foreground notification.
      playNotificationSound();
    });

    // ── Tap-to-navigate for push notifications ────────────────────────────────
    // When the app is in the BACKGROUND (iOS) or otherwise suspended and the user
    // taps a notification, the OS brings the app back to the foreground and
    // fires this handler with the tapped message. Route it to the tap handler so
    // tapping "New work posted" redirects the user to the work detail page.
    msg().onNotificationOpenedApp(async (remoteMessage: any) => {
      handleOpenedNotification(remoteMessage);
    });
  }

  // When the app was QUIT and a notification tap is what launches it, there is
  // no live handler at launch time — read the initial (opening) notification.
  try {
    const initial = await msg().getInitialNotification();
    if (initial) {
      handleOpenedNotification(initial);
    }
  } catch (err) {
    console.warn('[PushNotifications] getInitialNotification failed:', err);
  }
}

/** Returns true if Firebase Messaging is available. */
export async function isPushAvailable(): Promise<boolean> {
  const msg = await _getMessaging();
  return msg !== null;
}

// ---------------------------------------------------------------------------
// Notification preference (enable / disable)
// ---------------------------------------------------------------------------

/**
 * Persist the user's notification preference to the backend.
 */
export async function updateNotificationSettings(
  userId: string,
  enabled: boolean,
): Promise<void> {
  await api.patch(`/users/${userId}/notifications`, { enabled });
}

/**
 * Enable notifications: request OS permission, register the device token, and
 * persist the preference. Returns false when the user denies the native dialog.
 */
export async function enableNotifications(userId: string): Promise<boolean> {
  const granted = await requestPushNotif(userId);
  if (!granted) return false;
  await updateNotificationSettings(userId, true);
  return true;
}

/**
 * Disable notifications: unregister this device's tokens and persist the
 * preference.
 */
export async function disableNotifications(userId: string): Promise<void> {
  await unregisterDevice(userId);
  await updateNotificationSettings(userId, false);
}

/**
 * Persist the user's preference for the "new work posted within your search
 * range" broadcast. This is independent from the master notification switch —
 * it only controls whether the backend includes them in the near-me fan-out.
 */
export async function updateNewWorkNotifications(
  userId: string,
  enabled: boolean,
): Promise<void> {
  await api.patch(`/users/${userId}/notifications/new-work`, { enabled });
}
