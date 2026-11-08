/**
 * authService
 * Handles backend user registration / get-or-create after Google Sign-In,
 * and read-only user lookup (for silent session restore).
 *
 * When a user signs in via Google, we send the idToken to our NestJS backend.
 * The backend verifies the token and either returns the existing user or
 * creates a new record in the database, returning the user profile with
 * the persistent DB UUID.
 */

import { api, ApiError } from './api';
import {
  setTokens,
  clearTokens,
  getRefreshToken,
  refreshSessionOnce,
} from './authTokens';
import type { AuthUser } from '../store/useAuthStore';

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
}

/**
 * The backend may return the user either directly (`user: {...}`) or wrapped
 * in an extra object (`user: { user: {...} }`).  Normalise both shapes so the
 * rest of the app always receives the flat `AuthUser`.
 */
function normalizeUser(user: AuthUser | { user: AuthUser }): AuthUser {
  const nested = (user as { user?: AuthUser })?.user;
  return nested ?? (user as AuthUser);
}

/**
 * Register or get-or-create the user on the backend after Google sign-in.
 * Also called during silent session restore with a fresh idToken.
 *
 * @param idToken - The Google ID token from the sign-in result.
 * @returns The authenticated user profile from our database.
 */
export async function registerWithGoogle(idToken: string): Promise<AuthUser> {
  const response = await api.post<AuthResponse>('/auth/google', { idToken });
  await setTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });
  return normalizeUser(response.user);
}

/**
 * Register / get-or-create the user on the backend after Sign in with Apple.
 *
 * Apple only returns the user's name on the FIRST authorization, so `fullName`
 * is optional and passed through when present.
 *
 * @param identityToken - The Apple identity token (JWT) from `performRequest`.
 * @param fullName - The user's name from the first-time authorization.
 * @returns The authenticated user profile from our database.
 */
export async function registerWithApple(
  identityToken: string,
  fullName?: { givenName?: string | null; familyName?: string | null },
  nonce?: string,
): Promise<AuthUser> {
  const body: Record<string, unknown> = { identityToken };
  if (fullName) {
    body.fullName = fullName;
  }
  if (nonce) {
    body.nonce = nonce;
  }
  const response = await api.post<AuthResponse>('/auth/apple', body);
  await setTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });
  return normalizeUser(response.user);
}

/**
 * Sign in as the shared demo account.  The backend looks up (or creates) the
 * demo user and returns its profile with the persistent DB UUID.
 *
 * @returns The authenticated demo user profile from our database.
 */
export async function registerWithDemo(): Promise<AuthUser> {
  const response = await api.post<AuthResponse>('/auth/demo', {});
  await setTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });
  return normalizeUser(response.user);
}

/**
 * Read-only lookup of the existing DB user via the Google ID token.
 * Unlike registerWithGoogle, this does NOT create a new user if one
 * doesn't exist. Used as a robust fallback during silent session
 * restore to ensure the persistent DB UUID is always obtained.
 *
 * @param idToken - The Google ID token.
 * @returns The user profile with the persistent DB UUID.
 */
export async function fetchUserByToken(idToken: string): Promise<AuthUser> {
  const response = await api.get<AuthResponse>(
    `/auth/me?idToken=${encodeURIComponent(idToken)}`,
  );
  return normalizeUser(response.user);
}

/**
 * Soft-delete the user account.  Sets deletedAt on the backend so the
 * user can no longer log in, but data is preserved for referential integrity.
 *
 * @param userId - The authenticated user's persistent DB UUID.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await api.post<void>(`/users/${userId}/soft-delete`, {});
}

/**
 * Exchange the stored refresh token for a fresh access/refresh pair and the
 * current user profile.  Returns null (and clears the stored tokens) when
 * there is no refresh token or the server rejected it (expired/revoked/replayed).
 */
export async function refreshSession(): Promise<AuthUser | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  try {
    // Use the shared single-flight refresh so this never races with the API
    // client's automatic 401-retry (`refreshAccessToken`). Presenting the same
    // refresh token in two concurrent /auth/refresh calls is treated as theft
    // by the backend (it rotates & revokes on first use) and revokes the whole
    // token family, force-logging the user out. Sharing one in-flight request
    // collapses both into a single rotation.
    const result = await refreshSessionOnce();
    if (!result) {
      return null;
    }
    const user = result.user as AuthUser | { user: AuthUser } | undefined;
    if (!user) {
      return null;
    }
    return normalizeUser(user);
  } catch (error: any) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 400)
    ) {
      await clearTokens();
      return null;
    }
    throw error;
  }
}

/**
 * Revoke the refresh token server-side (best-effort) and clear the secure
 * token store.  Called on explicit sign-out.
 */
export async function logoutSession(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await api.post<void>('/auth/logout', { refreshToken });
    } catch {
      // Best effort — the server expires the token on its own anyway.
    }
  }
  await clearTokens();
}
