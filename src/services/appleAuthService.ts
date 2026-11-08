/**
 * appleAuthService
 * Centralised Sign in with Apple configuration and session management.
 * Mirrors googleAuthService.
 *
 * Supports both platforms:
 *   - iOS: native `appleAuth` flow.
 *   - Android: Apple's web flow via `appleAuthAndroid` (requires a Service ID
 *     + a registered return URL in the Apple Developer portal — see
 *     ANDROID_SERVICE_ID / ANDROID_REDIRECT_URI below).
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  appleAuth,
  appleAuthAndroid,
} from '@invertase/react-native-apple-authentication';
import { setAuthUser, clearAuth } from '../store/useAuthStore';
import { registerWithApple } from './authService';

const APPLE_USER_STORAGE_KEY = '@solarimsys:apple-user';

// ---------------------------------------------------------------------------
// Android (web) configuration — create these in the Apple Developer portal:
//   https://developer.apple.com/account/resources/identifiers/serviceId
// ---------------------------------------------------------------------------

/** The Service ID identifier (its audience is used in the identity token). */
const ANDROID_SERVICE_ID: string = 'com.solarimsys.signin';

/**
 * Return URL registered against the Service ID.  Must be a real, HTTPS domain
 * (not an IP or localhost).  The library intercepts the redirect client-side,
 * but the URL must still resolve — we serve this exact path from the backend
 * so it is reachable (see backend/src/auth/apple-callback.controller.ts).
 * The host mirrors the production API host (solarimsys.online serves the
 * web front-end; the backend lives on the `api.` subdomain).
 */
const ANDROID_REDIRECT_URI: string =
  'https://api.prod.solarimsys.online/apple/callback';

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export function isAppleSignInAvailable(): boolean {
  if (Platform.OS === 'ios') {
    return !!appleAuth.isSupported;
  }
  if (Platform.OS === 'android') {
    console.log(
      appleAuthAndroid?.isSupported,
      ANDROID_SERVICE_ID,
      ANDROID_REDIRECT_URI,
    );
    return (
      !!appleAuthAndroid.isSupported &&
      ANDROID_SERVICE_ID !== '' &&
      ANDROID_REDIRECT_URI !== ''
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// One-time configuration (call once at app start)
// ---------------------------------------------------------------------------

let _configured = false;

export function configureAppleSignIn(): void {
  if (_configured) {
    return;
  }

  // The credential-revoked event only exists on iOS.
  if (Platform.OS === 'ios' && appleAuth.isSupported) {
    _configured = true;
    // If the user revokes access in iOS Settings while the app is closed,
    // Apple fires this event — log them out locally.
    appleAuth.onCredentialRevoked(async () => {
      await _forgetAppleUser();
      clearAuth();
    });
  }
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

export interface AppleSignInResult {
  /**
   * Apple's stable subject id.  Only returned by the iOS native flow; on
   * Android it is `null` (the backend derives it from the identity token).
   */
  user: string | null;
  /** The JWT identity token to send to our backend. */
  identityToken: string;
  /**
   * Raw nonce.  The library SHA-256 hashes this before sending to Apple, and
   * the identity token's `nonce` claim contains that hash — the backend
   * re-hashes this raw value to verify.
   */
  nonce: string;
  /** Present on first authorization only. */
  email: string | null;
  givenName: string | null;
  familyName: string | null;
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  if (Platform.OS === 'android') {
    return signInWithAppleAndroid();
  }

  // if (!isAppleSignInAvailable()) {
  //   throw new Error('Sign in with Apple is not available on this device.');
  // }

  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });

  if (!response?.identityToken) {
    throw new Error('Apple sign-in returned no identity token.');
  }

  console.log('[auth] apple sign-in response:', {
    user: response.user,
    identityToken: response.identityToken,
    nonce: response.nonce,
    email: response.email,
    fullName: response.fullName,
  });

  return {
    user: response.user,
    identityToken: response.identityToken,
    nonce: response.nonce,
    email: response.email ?? null,
    givenName: response.fullName?.givenName ?? null,
    familyName: response.fullName?.familyName ?? null,
  };
}

async function signInWithAppleAndroid(): Promise<AppleSignInResult> {
  appleAuthAndroid.configure({
    clientId: ANDROID_SERVICE_ID,
    redirectUri: ANDROID_REDIRECT_URI,
    responseType: appleAuthAndroid.ResponseType.ALL,
    scope: appleAuthAndroid.Scope.ALL,
  });

  const response = await appleAuthAndroid.signIn();
  if (!response.id_token) {
    throw new Error('Apple sign-in returned no identity token.');
  }

  return {
    user: null,
    identityToken: response.id_token,
    nonce: response.nonce ?? '',
    email: response.user?.email ?? null,
    givenName: response.user?.name?.firstName ?? null,
    familyName: response.user?.name?.lastName ?? null,
  };
}

/**
 * Register / look up the user on our backend, then store the result in the
 * auth store.  Throws (with the reason) on failure so a failed sign-in can
 * never leave the screen silently logged out.
 */
export async function registerBackendAndSetUser(
  result: AppleSignInResult,
): Promise<void> {
  const fullName =
    result.givenName || result.familyName
      ? { givenName: result.givenName, familyName: result.familyName }
      : undefined;

  const user = await registerWithApple(
    result.identityToken,
    fullName,
    result.nonce || undefined,
  );
  if (!user?.id) {
    clearAuth();
    throw new Error('backend returned no user object');
  }

  setAuthUser({ ...user, provider: 'apple' });
  if (result.user) {
    await _rememberAppleUser(result.user);
  }
}

// ---------------------------------------------------------------------------
// Session restoration (called on app boot)
// ---------------------------------------------------------------------------

export async function restoreAppleSession(): Promise<void> {
  // Credential-state checking is iOS-only.  On Android the session relies on
  // the persisted auth (the web flow has no persistent credential state).
  if (Platform.OS !== 'ios' || !appleAuth.isSupported) {
    return;
  }

  try {
    const appleUser = await _readAppleUser();
    if (!appleUser) {
      // No Apple session recorded — keep persisted auth (or stay logged out).
      return;
    }

    // Check whether Apple still considers this credential valid.  On the
    // simulator this always throws, so we keep persisted auth (the source of
    // truth) rather than logging the user out.
    const state = await appleAuth.getCredentialStateForUser(appleUser);
    if (
      state === appleAuth.State.REVOKED ||
      state === appleAuth.State.NOT_FOUND
    ) {
      await _forgetAppleUser();
      clearAuth();
      return;
    }
  } catch (error) {
    console.warn('[auth] apple restore:', _message(error));
  }
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

/**
 * Apple has no server-side "sign out" — clearing the locally persisted
 * credential mapping is sufficient.
 */
export async function signOutApple(): Promise<void> {
  await _forgetAppleUser();
}

// ---------------------------------------------------------------------------
// Error reporting
// ---------------------------------------------------------------------------

/**
 * Turn a sign-in failure into a message worth showing the user.  Returns
 * `null` for benign cancellation so the caller stays silent.
 */
export function describeAppleSignInError(error: unknown): string | null {
  const code = (error as { code?: string } | undefined)?.code;

  // iOS ASAuthorizationError codes
  if (code === '1001') {
    return null; // .canceled — user dismissed the sheet
  }
  if (code === '1003') {
    return null; // .notHandled — request in progress / not handled
  }

  // Android (appleAuthAndroid) error codes — see AppleAuthenticationAndroidModule
  if (code === 'E_SIGNIN_CANCELLED_ERROR') {
    return null; // user closed the browser
  }
  if (code === 'E_NOT_CONFIGURED_ERROR') {
    return (
      'Sign in with Apple is not configured for Android.\n\n' +
      'Set ANDROID_SERVICE_ID and ANDROID_REDIRECT_URI in appleAuthService.ts ' +
      'and register them in the Apple Developer portal.'
    );
  }

  const message = _message(error);
  if (!message) {
    return 'Could not sign in with Apple. Please try again.';
  }
  return code ? `${message}\n\n(code ${code})` : message;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _message(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

async function _rememberAppleUser(user: string): Promise<void> {
  try {
    await AsyncStorage.setItem(APPLE_USER_STORAGE_KEY, user);
  } catch {
    // Best effort
  }
}

async function _forgetAppleUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(APPLE_USER_STORAGE_KEY);
  } catch {
    // Best effort
  }
}

async function _readAppleUser(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(APPLE_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}
