/**
 * authTokens
 * In-memory cache + persistence orchestration for the access/refresh token
 * pair.  Keeps tokens available synchronously to the API client while
 * mirroring them to secure storage.
 *
 * Also owns the single-flight refresh: concurrent 401s collapse into one
 * `/auth/refresh` request.
 */

import { API_BASE_URL } from '../constants';
import {
  saveTokens as persistTokens,
  loadTokens as loadStoredTokens,
  clearTokens as clearStoredTokens,
} from './secureTokenStore';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Full body of a successful `/auth/refresh` response (tokens + user profile). */
export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  user?: unknown;
}

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _refreshPromise: Promise<RefreshResult | null> | null = null;
let _onSessionExpired: (() => void) | null = null;

/** Register a callback invoked when the refresh token is rejected (401). */
export function setSessionExpiredHandler(handler: () => void): void {
  _onSessionExpired = handler;
}

export async function setTokens(tokens: TokenPair): Promise<void> {
  _accessToken = tokens.accessToken;
  _refreshToken = tokens.refreshToken;
  await persistTokens(tokens);
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function getRefreshToken(): string | null {
  return _refreshToken;
}

export async function clearTokens(): Promise<void> {
  _accessToken = null;
  _refreshToken = null;
  _refreshPromise = null;
  await clearStoredTokens();
}

/** Load tokens from secure storage into memory (called once at app start). */
export async function loadTokens(): Promise<void> {
  const stored = await loadStoredTokens();
  if (stored) {
    _accessToken = stored.accessToken;
    _refreshToken = stored.refreshToken;
  }
}

/**
 * Refresh the token pair using the stored refresh token (single-flight) and
 * return the full refresh response (tokens + user profile).
 *
 * Single-flight is critical: the backend rotates & revokes a refresh token on
 * every use, and re-presenting the *same* token concurrently is treated as
 * theft — it revokes the whole family and force-logs the user out. During a
 * cold start both the API client's automatic 401-retry (`refreshAccessToken`)
 * and the boot session restore (`refreshSession`) may fire at once, so both
 * MUST collapse into a single network request. Returns null on failure; a 401
 * clears the tokens and fires the session-expired handler.
 */
export function refreshSessionOnce(): Promise<RefreshResult | null> {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    const refreshToken = _refreshToken;
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 400) {
          await clearTokens();
          _onSessionExpired?.();
          return null;
        }
        throw new Error(`Refresh failed with status ${response.status}`);
      }

      const data = (await response.json()) as RefreshResult;
      await setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      return data;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/**
 * Refresh the access token, returning the new access token (or null when the
 * refresh failed). Shares the single-flight refresh with the boot session
 * restore so the same refresh token is never presented more than once.
 */
export function refreshAccessToken(): Promise<string | null> {
  return refreshSessionOnce()
    .then(result => result?.accessToken ?? null)
    .catch(() => null);
}
