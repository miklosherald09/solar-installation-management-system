/**
 * React Query hooks for work operations
 * Provides data fetching, caching, and mutation for works
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Work } from '../types';
import {
  fetchWorks,
  fetchWorksByUserId,
  fetchCompletedWorksByUserId,
  fetchWorkById,
  createWork,
  completeWork,
  deleteWork,
  updateWork,
  acceptApplicant,
  UpdateWorkData,
  fetchWorkHistory,
} from '../services/workService';

// Query keys for cache management
export const workKeys = {
  all: ['works'] as const,
  lists: () => [...workKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...workKeys.lists(), filters] as const,
  details: () => [...workKeys.all, 'detail'] as const,
  detail: (id: string) => [...workKeys.details(), id] as const,
};

export interface NearMeQuery {
  latitude: number;
  longitude: number;
  rangeKm: number;
}

/**
 * Hook to fetch works. When `nearMe` is provided, the list is filtered
 * server-side by distance and automatically refetched when it changes.
 */
export function useWorks(nearMe?: NearMeQuery) {
  const queryKey = nearMe
    ? [
        ...workKeys.lists(),
        'near',
        nearMe.latitude,
        nearMe.longitude,
        nearMe.rangeKm,
      ]
    : workKeys.lists();

  return useQuery({
    queryKey,
    queryFn: () => fetchWorks(nearMe),
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch only works posted by a specific user.
 */
export function useUserWorks(userId: string | undefined) {
  return useQuery({
    queryKey: [...workKeys.lists(), { postedBy: userId }],
    queryFn: () => fetchWorksByUserId(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch only completed works associated with a specific user.
 */
export function useUserCompletedWorks(userId: string | undefined) {
  return useQuery({
    queryKey: [...workKeys.lists(), { completedBy: userId }],
    queryFn: () => fetchCompletedWorksByUserId(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch a single work by ID.
 */
export function useWork(id: string) {
  return useQuery({
    queryKey: workKeys.detail(id),
    queryFn: () => fetchWorkById(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Hook to fetch work history by work ID.
 */
export function useWorkHistory(workId: string) {
  return useQuery({
    queryKey: [...workKeys.detail(workId), 'history'],
    queryFn: () => fetchWorkHistory(workId),
    enabled: !!workId,
    staleTime: 10_000,
  });
}

/**
 * Hook to create a new work.
 */
export function useCreateWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      workData: Omit<Work, 'id' | 'createdAt' | 'applicants' | 'postedBy'> & {
        postedBy?: string;
      },
    ) => createWork(workData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workKeys.lists() });
    },
  });
}

/**
 * Hook to apply to a work (local-only increment).
 */
export function useApplyToWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workId: string) => {
      // TODO: wire to backend API when apply feature is ready
      return Promise.resolve(workId);
    },
    onSuccess: (_data, workId) => {
      queryClient.invalidateQueries({ queryKey: workKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workKeys.detail(workId) });
    },
  });
}

/**
 * Hook to delete a work.
 */
export function useDeleteWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workId: string) => deleteWork(workId),
    onSuccess: (_data, workId) => {
      queryClient.invalidateQueries({ queryKey: workKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workKeys.detail(workId) });
    },
  });
}

/**
 * Hook to update an existing work's location.
 */
export function useUpdateWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workId: string; data: UpdateWorkData }) =>
      updateWork(params.workId, params.data),
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: workKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: workKeys.detail(params.workId),
      });
    },
  });
}

/**
 * Hook to mark a work as completed.
 */
export function useCompleteWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workId: string) => completeWork(workId),
    onSuccess: (_data, workId) => {
      queryClient.invalidateQueries({ queryKey: workKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workKeys.detail(workId) });
    },
  });
}

/**
 * Hook to accept an applicant for a work.
 */
export function useAcceptApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      workId: string;
      userId: string;
      currentAcceptedIds: string[];
    }) => acceptApplicant(params.workId, params.userId, params.currentAcceptedIds),
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: workKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workKeys.detail(params.workId) });
    },
  });
}
