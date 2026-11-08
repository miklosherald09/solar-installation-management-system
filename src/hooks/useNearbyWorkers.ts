/**
 * React Query hook for fetching nearby workers.
 * Enabled only when a near-me location is active.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchNearbyWorkers } from '../services/nearbyWorkersService';

export const nearbyWorkerKeys = {
  all: ['users', 'nearby'] as const,
  list: (lat: number, lng: number, rangeKm: number) =>
    [...nearbyWorkerKeys.all, lat, lng, rangeKm] as const,
};

interface NearMeParams {
  latitude: number;
  longitude: number;
  rangeKm: number;
}

/**
 * Fetch workers near the user's configured near-me location.
 * Disabled when `nearMe` is undefined (no active location).
 */
export function useNearbyWorkers(nearMe?: NearMeParams) {
  return useQuery({
    queryKey: nearMe
      ? nearbyWorkerKeys.list(nearMe.latitude, nearMe.longitude, nearMe.rangeKm)
      : nearbyWorkerKeys.all,
    queryFn: () =>
      fetchNearbyWorkers(nearMe!.latitude, nearMe!.longitude, nearMe!.rangeKm),
    select: data =>
      data.filter(
        worker => worker.capableWorkTypes && worker.capableWorkTypes.length > 0,
      ),
    enabled: !!nearMe,
    staleTime: 60_000, // 1 minute — worker availability doesn't change that fast
    refetchOnWindowFocus: false,
  });
}
