/**
 * React Query hooks for reviews and credibility.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createReview,
  hasReviewed,
  getUserReviews,
  getUserCredibility,
  CreateReviewInput,
} from '../services/reviewService';

// Query keys
export const reviewKeys = {
  all: ['reviews'] as const,
  credibility: (userId: string) =>
    [...reviewKeys.all, 'credibility', userId] as const,
  list: (userId: string) => [...reviewKeys.all, 'list', userId] as const,
  check: (workId: string, revieweeId: string) =>
    [...reviewKeys.all, 'check', workId, revieweeId] as const,
};

/**
 * Fetch credibility stats for a user (avg rating, review count, completed works).
 */
export function useCredibility(userId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.credibility(userId || ''),
    queryFn: () => getUserCredibility(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/**
 * Fetch paginated reviews for a user.
 */
export function useUserReviews(userId: string | undefined, skip = 0, take = 20) {
  return useQuery({
    queryKey: [...reviewKeys.list(userId || ''), skip, take],
    queryFn: () => getUserReviews(userId!, skip, take),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/**
 * Check if current user has already reviewed a target user for a specific work.
 */
export function useHasReviewed(
  workId: string | undefined,
  revieweeId: string | undefined,
) {
  return useQuery({
    queryKey: reviewKeys.check(workId || '', revieweeId || ''),
    queryFn: () => hasReviewed(workId!, revieweeId!),
    enabled: !!workId && !!revieweeId,
    staleTime: 10_000,
  });
}

/**
 * Submit a review for another user.
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewInput) => createReview(input),
    onSuccess: (_data, input) => {
      // Invalidate credibility and review list for the reviewee
      queryClient.invalidateQueries({
        queryKey: reviewKeys.credibility(input.revieweeId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.list(input.revieweeId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.check(input.workId, input.revieweeId),
      });
    },
  });
}