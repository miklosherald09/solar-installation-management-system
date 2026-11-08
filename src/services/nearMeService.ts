/**
 * nearMeService
 * Syncs near-me search preferences to the backend PostgreSQL database
 * so they persist across app restarts and devices.
 */

import { api } from './api';

export interface NearMePreferences {
  nearMeLocation?: string | null;
  nearMeConciseLocation?: string | null;
  nearMeLatitude?: number | null;
  nearMeLongitude?: number | null;
  nearMeRangeKm?: number;
}

/**
 * Save near-me preferences for a user.
 * PATCH /users/:userId/near-me
 */
export async function saveNearMePreferences(
  userId: string,
  prefs: NearMePreferences,
): Promise<void> {
  await api.patch(`/users/${userId}/near-me`, prefs);
}

/** Raw near-me fields returned by GET /users/:id. */
interface ApiUserNearMe {
  nearMeLocation: string | null;
  nearMeConciseLocation: string | null;
  nearMeLatitude: number | null;
  nearMeLongitude: number | null;
  nearMeRangeKm: number;
}

/**
 * Fetch the user's saved near-me preferences from the backend.
 * GET /users/:userId
 */
export async function fetchNearMePreferences(
  userId: string,
): Promise<NearMePreferences> {
  const user = await api.get<ApiUserNearMe>(`/users/${userId}`);
  return {
    nearMeLocation: user.nearMeLocation,
    nearMeConciseLocation: user.nearMeConciseLocation,
    nearMeLatitude: user.nearMeLatitude,
    nearMeLongitude: user.nearMeLongitude,
    nearMeRangeKm: user.nearMeRangeKm,
  };
}
