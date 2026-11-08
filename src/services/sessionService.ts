/**
 * sessionService
 * Restores the session from a stored refresh token on app boot.
 *
 * Unlike the Google/Apple SDK restores, this path has no third-party
 * dependency: it exchanges the stored refresh token for a fresh access/refresh
 * pair and the current user profile.  If the refresh token is dead
 * (revoked/expired/rotated elsewhere) the session is cleared so the user lands
 * on the sign-in screen rather than a half-dead session.
 */

import { ApiError } from './api';
import {
  loadTokens,
  getRefreshToken,
  setSessionExpiredHandler,
} from './authTokens';
import { refreshSession } from './authService';
import { clearAuth, setAuthUser } from '../store/useAuthStore';

export async function restoreSessionFromTokens(): Promise<void> {
  // When any request discovers the refresh token is dead, log the user out.
  setSessionExpiredHandler(() => clearAuth());

  try {
    await loadTokens();
  } catch {
    // Secure storage unavailable — treat as no stored session.
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    // No token-based session: keep whatever AsyncStorage restored (if any)
    // and let the Google/Apple SDK restores run.
    return;
  }

  try {
    const user = await refreshSession();
    if (user?.id) {
      setAuthUser(user);
    } else {
      clearAuth();
    }
  } catch (error: any) {
    // Only log the user out on explicit invalid session/token errors (400 or 401).
    // For network errors or 5xx server issues, keep the restored AsyncStorage
    // credentials so the user remains logged in offline.
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 400)
    ) {
      clearAuth();
    } else {
      console.warn(
        '[sessionService] Token refresh skipped (offline or server unreachable); keeping cached session.',
      );
    }
  }
}
