/**
 * googleAuthService
 * Centralised Google Sign-In configuration and session management.
 * Re-exports everything LoginScreen & App need.
 */

import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { setAuthUser, clearAuth, type AuthUser } from '../store/useAuthStore';
import { registerWithGoogle, fetchUserByToken } from './authService';

// ---------------------------------------------------------------------------
// Client IDs – keep them in one place
// ---------------------------------------------------------------------------

const WEB_CLIENT_ID =
  '1019411815862-l0m1hf1ceqc6923ok7rvf79fvimtoeor.apps.googleusercontent.com';

const IOS_CLIENT_ID =
  '1019411815862-oo152lm57nb59hniv6heveareoqie76k.apps.googleusercontent.com';

// ---------------------------------------------------------------------------
// One-time configuration (call once at app start)
// ---------------------------------------------------------------------------

let _configured = false;

export function configureGoogleSignIn(): void {
  if (_configured) {
    return;
  }
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
    scopes: [],
    forceCodeForRefreshToken: false,
    accountName: '',
    iosClientId: IOS_CLIENT_ID,
    profileImageSize: 120,
  });
  _configured = true;
}

// ---------------------------------------------------------------------------
// Session restoration (called on app boot)
// ---------------------------------------------------------------------------

export async function restoreGoogleSession(): Promise<void> {
  try {
    const hasPreviousSignIn = GoogleSignin.hasPreviousSignIn();
    if (!hasPreviousSignIn) {
      // No previous Google session — if we have persisted auth from
      // AsyncStorage, keep it (the user object is the source of truth).
      // Otherwise the user is simply not signed in.
      return;
    }

    let idToken = GoogleSignin.getCurrentUser()?.idToken ?? undefined;

    if (!idToken) {
      // Signed in but no cached token – silently sign in to obtain one
      try {
        const signInResult = await GoogleSignin.signInSilently();
        if (!signInResult.data) {
          // Silent sign-in produced nothing — keep persisted auth if any
          return;
        }
        idToken = signInResult.data.idToken ?? undefined;
      } catch (error) {
        // Silent sign-in failed (e.g. token expired) — keep persisted auth
        console.warn('[auth] restore: signInSilently failed:', _message(error));
        return;
      }
    }

    await _refreshBackendAndSetUser(idToken);
  } catch (error) {
    // Don't log the user out — they keep whatever persisted state we have
    console.warn('[auth] restore: unexpected failure:', _message(error));
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract a printable message from an unknown thrown value. */
function _message(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

/**
 * Store the backend user, rejecting a malformed response.  Without this a
 * response whose shape changed would put the store into
 * `isAuthenticated: true, user: null`, which reads as "logged out" to every
 * screen while reporting success to the caller.
 */
function _setVerifiedUser(user: AuthUser | undefined): void {
  if (!user?.id) {
    throw new Error('backend returned no user object');
  }
  setAuthUser({ ...user, provider: 'google' });
}

/**
 * Resolve the idToken to send to the backend.
 *
 * Prefer the token the caller already got from `signIn()`.  On Android
 * `getTokens()` only refreshes the *access* token — the idToken it returns is
 * the same cached `GoogleSignInAccount.getIdToken()` — so calling it buys no
 * freshness while adding a network round-trip that requests every configured
 * OAuth scope and can fail with UserRecoverableAuthException.
 */
async function _resolveIdToken(idToken?: string): Promise<string | undefined> {
  if (idToken) {
    return idToken;
  }
  const tokens = await GoogleSignin.getTokens();
  return tokens.idToken ?? undefined;
}

/**
 * Register / look up the user in the backend database, then store the result
 * in the auth store.
 *
 * The key goal is to always obtain the persistent **DB UUID** and never
 * fall back to the Google numeric ID.
 *
 * Called during explicit sign-in (LoginScreen, GoogleSignInButton).  On
 * failure we clear auth *and throw* — the caller must surface the reason,
 * otherwise the user is left staring at a login screen with no explanation.
 *
 * @param idToken - The idToken from `signIn()`.  Omit only when there is no
 *   sign-in result to hand (it is then read from `getTokens()`).
 */
export async function registerBackendAndSetUser(
  idToken?: string,
): Promise<void> {
  let token: string | undefined;
  try {
    token = await _resolveIdToken(idToken);
  } catch (error) {
    clearAuth();
    throw new Error(`Could not read Google tokens: ${_message(error)}`);
  }

  if (!token) {
    clearAuth();
    throw new Error(
      'Google sign-in completed but returned no ID token.\n\n' +
        'Check that an OAuth client of type Android exists — with package ' +
        "name com.solarimsys and this build's signing SHA-1 — in the " +
        'Google Cloud project that owns the web client ' +
        `${WEB_CLIENT_ID}.`,
    );
  }

  // 1. Try get-or-create (works for both new and returning users)
  let registerError: unknown;
  try {
    _setVerifiedUser(await registerWithGoogle(token));
    return;
  } catch (error) {
    registerError = error;
  }

  // 2. Fallback: read-only lookup (requires user to already exist in DB)
  try {
    _setVerifiedUser(await fetchUserByToken(token));
    return;
  } catch (lookupError) {
    // 3. Neither succeeded — don't store a fallback with a Google ID, and
    //    report both failures so the real cause is visible.
    clearAuth();
    throw new Error(
      'The server rejected the sign-in.\n\n' +
        `POST /auth/google: ${_message(registerError)}\n\n` +
        `GET /auth/me: ${_message(lookupError)}`,
    );
  }
}

/**
 * Refresh the backend user during session restore.
 * Unlike registerBackendAndSetUser this is **lenient** — if the network
 * is flaky we keep whatever persisted auth already exists rather than
 * logging the user out.  Failures are logged, never thrown.
 */
async function _refreshBackendAndSetUser(idToken?: string): Promise<void> {
  let token: string | undefined;
  try {
    token = await _resolveIdToken(idToken);
  } catch (error) {
    console.warn('[auth] restore: could not read tokens:', _message(error));
    return; // keep existing persisted auth
  }

  if (!token) {
    return; // keep existing persisted auth
  }

  // 1. Try get-or-create
  try {
    _setVerifiedUser(await registerWithGoogle(token));
    return;
  } catch (error) {
    console.warn('[auth] restore: POST /auth/google:', _message(error));
  }

  // 2. Fallback: read-only lookup
  try {
    _setVerifiedUser(await fetchUserByToken(token));
  } catch (error) {
    // Both failed — but we don't clear auth; the persisted state is
    // still valid.  The user may have a stale DB UUID but they remain
    // logged in.
    console.warn('[auth] restore: GET /auth/me:', _message(error));
  }
}

// ---------------------------------------------------------------------------
// Error reporting
// ---------------------------------------------------------------------------

/**
 * Turn a sign-in failure into a message worth showing the user.
 *
 * Returns `null` when the failure is a benign cancellation and the caller
 * should stay silent.  Shared by every sign-in entry point so no path can
 * swallow a failure.
 */
export function describeGoogleSignInError(error: unknown): string | null {
  const code = (error as { code?: string } | undefined)?.code;

  if (
    code === statusCodes.SIGN_IN_CANCELLED ||
    code === statusCodes.IN_PROGRESS
  ) {
    return null;
  }

  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services is not available or is out of date.';
  }

  // CommonStatusCodes.DEVELOPER_ERROR — the native module rejects with
  // String.valueOf(10).
  if (code === '10') {
    return (
      'DEVELOPER_ERROR (10): this build is not registered with the OAuth ' +
      'client it is signing in against.\n\n' +
      `Web client: ${WEB_CLIENT_ID}\n\n` +
      'In Google Cloud Console → Credentials, for the project that owns ' +
      'that web client, add an OAuth client of type Android with package ' +
      "name com.solarimsys and the SHA-1 of this build's keystore " +
      '(the Play App Signing SHA-1 for store builds).'
    );
  }

  const message = _message(error);
  if (!message) {
    return 'Could not sign in with Google. Please try again.';
  }
  return code ? `${message}\n\n(code ${code})` : message;
}
