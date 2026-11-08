/**
 * React Query hook for search logs.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  logSearch,
  fetchRecentSearches,
  fetchAllSearches,
  deleteSearchLog,
  type SearchLogItem,
} from '../services/searchService';

export const searchLogKeys = {
  all: ['searchLogs'] as const,
  recent: (userId: string) => [...searchLogKeys.all, 'recent', userId] as const,
  list: (userId: string) => [...searchLogKeys.all, 'list', userId] as const,
};

/**
 * Fetch the user's recent searches (top 10).
 */
export function useRecentSearches(userId: string | undefined) {
  return useQuery({
    queryKey: searchLogKeys.recent(userId ?? ''),
    queryFn: () => fetchRecentSearches(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/**
 * Fetch ALL search logs for a user (management screen).
 */
export function useAllSearches(userId: string | undefined) {
  return useQuery({
    queryKey: searchLogKeys.list(userId ?? ''),
    queryFn: () => fetchAllSearches(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/**
 * Log a search query and invalidate the cache so recent searches refresh.
 */
export function useLogSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, query }: { userId: string; query: string }) =>
      logSearch(userId, query),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: searchLogKeys.recent(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: searchLogKeys.list(variables.userId),
      });
    },
  });
}

/**
 * Delete a search log entry and invalidate caches.
 * Removes the item from the UI instantly (optimistic update) without waiting
 * for the API response.
 */
export function useDeleteSearchLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId: _userId }: { id: string; userId: string }) =>
      deleteSearchLog(id),
    onMutate: async ({ id, userId }) => {
      // Cancel in-flight queries so the optimistic update is not overwritten.
      await queryClient.cancelQueries({
        queryKey: searchLogKeys.list(userId),
      });
      await queryClient.cancelQueries({
        queryKey: searchLogKeys.recent(userId),
      });

      // Snapshot previous data so we can roll back on error.
      const previousData = {
        list: queryClient.getQueryData(searchLogKeys.list(userId)),
        recent: queryClient.getQueryData(searchLogKeys.recent(userId)),
      };

      // Remove the deleted entry from both caches immediately.
      const removeItem = (items?: SearchLogItem[]) =>
        items?.filter(item => item.id !== id);

      queryClient.setQueryData(
        searchLogKeys.list(userId),
        removeItem(queryClient.getQueryData(searchLogKeys.list(userId))),
      );
      queryClient.setQueryData(
        searchLogKeys.recent(userId),
        removeItem(queryClient.getQueryData(searchLogKeys.recent(userId))),
      );

      return { previousData };
    },
    onError: (_err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          searchLogKeys.list(variables.userId),
          context.previousData.list,
        );
        queryClient.setQueryData(
          searchLogKeys.recent(variables.userId),
          context.previousData.recent,
        );
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: searchLogKeys.recent(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: searchLogKeys.list(variables.userId),
      });
    },
  });
}
