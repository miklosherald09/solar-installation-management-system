/**
 * React Query hooks for work types
 * Provides data fetching and caching for the DB-backed work type list
 */

import { useQuery } from '@tanstack/react-query';
import { fetchWorkTypes } from '../services/workTypeService';

// Query keys for cache management
export const workTypeKeys = {
  all: ['work-types'] as const,
  list: () => [...workTypeKeys.all, 'list'] as const,
};

/**
 * Hook to fetch all active work types (with images) from the backend.
 * Falls back gracefully in the UI when the API is unavailable.
 */
export function useWorkTypes() {
  return useQuery({
    queryKey: workTypeKeys.list(),
    queryFn: fetchWorkTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
