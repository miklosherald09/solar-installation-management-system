/**
 * locationSyncService
 *
 * Handles startup location synchronization:
 * When a user has an empty location (location, concise_location, longitude, latitude),
 * silently gets the user's GPS location on app open and saves the location details
 * to the database.
 */

import type { QueryClient } from '@tanstack/react-query';
import { getCurrentLocationInfo } from './geocodeService';
import type { LocationInfo } from '../types';
import { updateProfile, fetchUserById } from './userService';
import {
  fetchNearMePreferences,
  saveNearMePreferences,
  NearMePreferences,
} from './nearMeService';
import { getAuthState, setAuthUser } from '../store/useAuthStore';
import {
  applyNearMeLocation,
  setNearMeRange,
  activateNearMe,
} from '../store/useNearMeStore';
import { userSearchKeys } from '../hooks/useUsers';

let _locationSyncQueryClient: QueryClient | null = null;

export function setLocationSyncQueryClient(client: QueryClient): void {
  _locationSyncQueryClient = client;
}

/**
 * Checks whether a user has an empty location.
 * True if any of location, conciseLocation, latitude, or longitude is missing.
 */
export function isUserLocationEmpty(
  user?: {
    location?: string | null;
    conciseLocation?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null,
): boolean {
  if (!user) return true;
  return (
    !user.location?.trim() ||
    !user.conciseLocation?.trim() ||
    user.latitude == null ||
    user.longitude == null
  );
}

// Track in-flight syncs to prevent multiple simultaneous executions for the same user
const _inFlightSyncs = new Set<string>();

/**
 * Silently synchronizes the user's location and near-me preferences on app open.
 *
 * If the user's profile location is empty, it silently gets the device's GPS
 * location and persists location, conciseLocation, latitude, and longitude to the database.
 */
export async function syncLocationOnAppOpen(userId: string): Promise<void> {
  if (!userId || _inFlightSyncs.has(userId)) {
    return;
  }

  _inFlightSyncs.add(userId);
  try {
    const current = getAuthState().user;
    if (!current?.id || current.id !== userId) {
      return;
    }

    let needsProfileLocation = isUserLocationEmpty(current);

    // If local state indicates empty location, double check the remote database profile
    // in case the location was populated on another device or prior session.
    if (needsProfileLocation) {
      try {
        const remoteUser = await fetchUserById(userId);
        if (!isUserLocationEmpty(remoteUser)) {
          // Found saved location in DB — update local auth store
          setAuthUser({
            ...current,
            location: remoteUser.location,
            conciseLocation: remoteUser.conciseLocation,
            latitude: remoteUser.latitude,
            longitude: remoteUser.longitude,
          });
          needsProfileLocation = false;
        }
      } catch {
        // Network or fetch error — proceed with local check
      }
    }

    // Check near-me preferences
    let nearMePrefs: NearMePreferences = {
      nearMeLocation: current.nearMeLocation ?? null,
      nearMeConciseLocation: current.nearMeConciseLocation ?? null,
      nearMeLatitude: current.nearMeLatitude ?? null,
      nearMeLongitude: current.nearMeLongitude ?? null,
      nearMeRangeKm: current.nearMeRangeKm,
    };

    try {
      nearMePrefs = await fetchNearMePreferences(userId);
    } catch {
      // Fall back to current cached prefs
    }

    const hasSavedNearMe =
      nearMePrefs.nearMeLatitude != null && nearMePrefs.nearMeLongitude != null;

    if (hasSavedNearMe) {
      // Hydrate near-me store from saved preferences
      applyNearMeLocation({
        address: nearMePrefs.nearMeLocation ?? '',
        conciseAddress: nearMePrefs.nearMeConciseLocation ?? '',
        latitude: nearMePrefs.nearMeLatitude!,
        longitude: nearMePrefs.nearMeLongitude!,
      });
      if (nearMePrefs.nearMeRangeKm != null) {
        setNearMeRange(nearMePrefs.nearMeRangeKm);
      }
      activateNearMe();
    }

    // If profile location is already populated and near-me is already set, nothing to do
    if (!needsProfileLocation && hasSavedNearMe) {
      return;
    }

    // If profile location is populated but near-me is missing, seed near-me from profile
    if (
      !needsProfileLocation &&
      !hasSavedNearMe &&
      current.latitude != null &&
      current.longitude != null
    ) {
      const nextNearMe: NearMePreferences = {
        nearMeLocation: current.location ?? '',
        nearMeConciseLocation: current.conciseLocation ?? '',
        nearMeLatitude: current.latitude,
        nearMeLongitude: current.longitude,
        nearMeRangeKm: nearMePrefs.nearMeRangeKm ?? 5,
      };
      try {
        await saveNearMePreferences(userId, nextNearMe);
        applyNearMeLocation({
          address: nextNearMe.nearMeLocation ?? '',
          conciseAddress: nextNearMe.nearMeConciseLocation ?? '',
          latitude: nextNearMe.nearMeLatitude!,
          longitude: nextNearMe.nearMeLongitude!,
        });
        if (nextNearMe.nearMeRangeKm != null) {
          setNearMeRange(nextNearMe.nearMeRangeKm);
        }
        activateNearMe();
        setAuthUser({
          ...getAuthState().user!,
          ...nextNearMe,
        });
      } catch (err) {
        console.warn('[LocationSync] Seed near-me from profile failed:', err);
      }
      return;
    }

    // Profile location is empty: silently get GPS location and save to database
    let gpsInfo: LocationInfo | null = null;
    try {
      gpsInfo = await getCurrentLocationInfo();
    } catch (err) {
      // Silent fail — do not alert or interrupt the user
      console.log(
        '[LocationSync] Silent GPS location fetch unavailable:',
        (err as any)?.message ?? err,
      );
      return;
    }

    if (!gpsInfo) return;

    const locationData = {
      location: gpsInfo.address,
      conciseLocation: gpsInfo.conciseAddress || gpsInfo.address,
      latitude: gpsInfo.latitude,
      longitude: gpsInfo.longitude,
    };

    // 1. Save location details in the database
    try {
      await updateProfile(userId, locationData);
    } catch (err) {
      console.warn(
        '[LocationSync] Save profile location to database failed:',
        err,
      );
      return;
    }

    // 2. If near-me was also not saved, seed near-me preferences
    let updatedNearMe: NearMePreferences | null = null;
    if (!hasSavedNearMe) {
      updatedNearMe = {
        nearMeLocation: locationData.location,
        nearMeConciseLocation: locationData.conciseLocation,
        nearMeLatitude: locationData.latitude,
        nearMeLongitude: locationData.longitude,
        nearMeRangeKm: nearMePrefs.nearMeRangeKm ?? 5,
      };
      try {
        await saveNearMePreferences(userId, updatedNearMe);
        applyNearMeLocation({
          address: updatedNearMe.nearMeLocation ?? '',
          conciseAddress: updatedNearMe.nearMeConciseLocation ?? '',
          latitude: updatedNearMe.nearMeLatitude!,
          longitude: updatedNearMe.nearMeLongitude!,
        });
        if (updatedNearMe.nearMeRangeKm != null) {
          setNearMeRange(updatedNearMe.nearMeRangeKm);
        }
        activateNearMe();
      } catch (err) {
        console.warn('[LocationSync] Seed near-me failed:', err);
      }
    }

    // 3. Update local auth store (and persist to AsyncStorage)
    const latestAuth = getAuthState().user;
    if (latestAuth && latestAuth.id === userId) {
      setAuthUser({
        ...latestAuth,
        ...locationData,
        ...(updatedNearMe ? updatedNearMe : {}),
      });
    }

    // 4. Invalidate user detail query cache
    if (_locationSyncQueryClient) {
      _locationSyncQueryClient.invalidateQueries({
        queryKey: userSearchKeys.detail(userId),
      });
    }
  } finally {
    _inFlightSyncs.delete(userId);
  }
}
