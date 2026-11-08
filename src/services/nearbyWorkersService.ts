/**
 * Nearby Workers Service
 * Fetches workers near a given location from the backend API.
 */

import { api } from './api';

/** Shape returned by GET /users/nearby */
export interface NearbyWorker {
  id: string;
  name: string;
  photo: string | null;
  nearMeConciseLocation: string | null;
  neededWorkType: string[];
  capableWorkTypes: string[];
  distance: string;
  isOnline: boolean;
  workAvailability?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  credibility: {
    avgRating: number;
    reviewCount: number;
    completedWorks: number;
  };
}

/**
 * Fetch workers near a given location.
 * GET /users/nearby?latitude=...&longitude=...&rangeKm=...
 * If coordinates are omitted, backend defaults to logged-in user's nearMeLatitude & nearMeLongitude.
 */
export async function fetchNearbyWorkers(
  latitude?: number,
  longitude?: number,
  rangeKm?: number,
): Promise<NearbyWorker[]> {
  const params = new URLSearchParams();
  if (latitude != null) params.append('latitude', latitude.toString());
  if (longitude != null) params.append('longitude', longitude.toString());
  if (rangeKm != null) params.append('rangeKm', rangeKm.toString());
  const qs = params.toString();
  return api.get<NearbyWorker[]>(`/users/nearby${qs ? `?${qs}` : ''}`);
}
