/**
 * Auth Store
 * Persistent auth state using AsyncStorage.  Survives app restarts
 * on Android so the user is not logged out when the app is killed.
 */

import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyNearMeLocation,
  setNearMeRange,
  activateNearMe,
} from './useNearMeStore';
import { unregisterDevice } from '../services/pushNotificationService';
import { logoutSession } from '../services/authService';
import { loadTokens } from '../services/authTokens';
import type { WorkAvailability } from '../types';

const AUTH_STORAGE_KEY = '@solarimsys:auth';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  location?: string | null;
  conciseLocation?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  nearMeLocation?: string | null;
  nearMeConciseLocation?: string | null;
  nearMeLatitude?: number | null;
  nearMeLongitude?: number | null;
  nearMeRangeKm?: number;
  notificationsEnabled?: boolean;
  newWorkNotificationsEnabled?: boolean;
  /**
   * Work-type slugs the user is capable of / willing to work.
   * Captured automatically when the user taps "I'm Interested" on a work,
   * and editable later from profile settings.
   */
  neededWorkType?: string[];
  /**
   * Work-type slugs the user is skilled at / willing to perform.
   * Selected via the onboarding modal or profile settings.
   */
  capableWorkTypes?: string[];
  /** Which sign-in provider this session was created with. */
  provider?: 'google' | 'apple' | 'demo';
  role?: 'USER' | 'ADMIN' | 'MODERATOR' | string;
  verifiedAt?: string | null;
  verifiedByUserId?: string | null;
  workAvailability?: WorkAvailability;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
}

let _state: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true, // start as loading while we restore the session
};

const _listeners = new Set<() => void>();

function _emit() {
  _listeners.forEach(fn => fn());
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

async function _persist() {
  try {
    if (_state.isAuthenticated && _state.user) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(_state.user));
    } else {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Silently fail — storage is best-effort
  }
}

// ---------------------------------------------------------------------------
// Initialization — load persisted auth before anything else
// ---------------------------------------------------------------------------

let _initPromise: Promise<void> | null = null;

let _queryClientClearer: (() => void) | null = null;

export function setQueryClientClearer(fn: () => void): void {
  _queryClientClearer = fn;
}

export function initAuthStore(): Promise<void> {
  if (_initPromise) {
    return _initPromise;
  }

  _initPromise = (async () => {
    // Load the access/refresh tokens from secure storage *before* restoring the
    // persisted user below.  Emitting `user` immediately triggers the
    // authenticated effects in App.tsx (SIP init, near-me sync, push
    // registration), so the access token must already be in `authTokens` memory
    // — otherwise those first requests go out without an Authorization header
    // and 401 (api.request only retries a 401 when a token was attached).
    try {
      await loadTokens();
    } catch {
      // Secure storage unavailable — fall through with no tokens.
    }

    try {
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const user = JSON.parse(raw) as AuthUser;
        // Only restore if it looks like a valid user object
        if (user && typeof user.id === 'string' && user.id.length > 0) {
          // Keep `loading` true — App.tsx finalizes it once every restore
          // path (token + Google/Apple SDK) has settled, so the app never
          // flashes a logged-out UI for a session that's about to restore.
          _state = { isAuthenticated: true, user, loading: true };
          hydrateNearMeStore(user);
          _emit();
          return;
        }
      }
      // No persisted auth — stay in loading until restoreGoogleSession finishes
      _state = { isAuthenticated: false, user: null, loading: true };
      _emit();
    } catch {
      _state = { isAuthenticated: false, user: null, loading: true };
      _emit();
    }
  })();

  return _initPromise;
}

// ---------------------------------------------------------------------------
// Public helpers (usable outside React components)
// ---------------------------------------------------------------------------

/** Hydrate the near-me store from a user's saved preferences. */
function hydrateNearMeStore(user: AuthUser) {
  if (
    user.nearMeLocation &&
    user.nearMeLatitude != null &&
    user.nearMeLongitude != null
  ) {
    applyNearMeLocation({
      address: user.nearMeLocation,
      conciseAddress: user.nearMeConciseLocation ?? '',
      latitude: user.nearMeLatitude,
      longitude: user.nearMeLongitude,
    });
    activateNearMe();
  }
  if (user.nearMeRangeKm != null) {
    setNearMeRange(user.nearMeRangeKm);
  }
}

export function setAuthUser(user: AuthUser) {
  // Preserve `loading`: during boot the restore pipeline keeps it `true` until
  // all restore paths settle (App.tsx finalizes via setAuthInitialized()).
  // Explicit sign-in runs when `loading` is already `false`, so it is unchanged.
  _state = { isAuthenticated: true, user, loading: _state.loading };

  // Hydrate near-me store from the user's saved preferences
  hydrateNearMeStore(user);

  _persist();
  _emit();
}

export function setAuthUserWorkAvailability(workAvailability: WorkAvailability) {
  if (!_state.user) return;
  _state = {
    ..._state,
    user: {
      ..._state.user,
      workAvailability,
    },
  };
  _persist();
  _emit();
}

export function clearAuth() {
  _state = { isAuthenticated: false, user: null, loading: _state.loading };
  _persist();
  _emit();
}

export function setAuthLoading(loading: boolean) {
  _state = { ..._state, loading };
  _emit();
}

export function setAuthInitialized() {
  _state = { ..._state, loading: false };
  _emit();
}

export function getAuthState(): Readonly<AuthState> {
  return _state;
}

/**
 * Sign out — clears persisted auth AND revokes Google access.
 * Call this from the profile screen sign-out button.
 */
export async function signOut(): Promise<void> {
  // Delete all device_token rows for this device identity
  const userId = _state.user?.id;
  if (userId) {
    await unregisterDevice(userId);
  }
  // Clear cached react-query data
  _queryClientClearer?.();
  // Revoke the refresh token server-side and clear the secure token store.
  await logoutSession();
  clearAuth();
  try {
    const {
      GoogleSignin,
    } = require('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Best effort
  }
  try {
    const { signOutApple } = require('../services/appleAuthService');
    await signOutApple();
  } catch {
    // Best effort — Apple has no server-side sign-out anyway
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useAuthStore() {
  return useSyncExternalStore(
    (cb: () => void) => {
      _listeners.add(cb);
      return () => {
        _listeners.delete(cb);
      };
    },
    () => _state,
  );
}
