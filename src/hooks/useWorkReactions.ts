/**
 * useWorkReactions
 * React Query hooks for managing work reactions (like, emojis, emoticons).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WorkReactionSummary } from '../types';
import {
  fetchWorkReactions,
  toggleWorkReaction,
  removeWorkReaction,
} from '../services/workReactionService';

export const workReactionKeys = {
  all: ['work-reactions'] as const,
  detail: (workId: string, userId?: string) =>
    [...workReactionKeys.all, 'detail', workId, userId || 'anon'] as const,
};

/**
 * Fetch reactions for a specific work.
 */
export function useWorkReactions(workId: string, userId?: string) {
  return useQuery({
    queryKey: workReactionKeys.detail(workId, userId),
    queryFn: () => fetchWorkReactions(workId, userId),
    enabled: !!workId,
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * Toggle or change a reaction on a work listing with optimistic update.
 */
export function useToggleWorkReaction(workId: string, userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reaction }: { reaction: string }) =>
      toggleWorkReaction(workId, reaction, userId),
    onMutate: async ({ reaction }) => {
      const queryKey = workReactionKeys.detail(workId, userId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<WorkReactionSummary>(queryKey);

      const prevUserReaction = previous?.userReaction ?? null;
      const prevTotal = previous?.totalCount ?? 0;
      const prevCounts = { ...(previous?.counts ?? {}) };

      let nextUserReaction: string | null = reaction;
      let nextTotal = prevTotal;

      if (prevUserReaction === reaction) {
        // Toggling off the existing reaction
        nextUserReaction = null;
        nextTotal = Math.max(0, prevTotal - 1);
        if (prevCounts[reaction]) {
          prevCounts[reaction] = Math.max(0, prevCounts[reaction] - 1);
          if (prevCounts[reaction] === 0) delete prevCounts[reaction];
        }
      } else {
        if (prevUserReaction) {
          // Changing from one reaction to another
          if (prevCounts[prevUserReaction]) {
            prevCounts[prevUserReaction] = Math.max(
              0,
              prevCounts[prevUserReaction] - 1,
            );
            if (prevCounts[prevUserReaction] === 0)
              delete prevCounts[prevUserReaction];
          }
          prevCounts[reaction] = (prevCounts[reaction] || 0) + 1;
        } else {
          // New reaction
          nextTotal = prevTotal + 1;
          prevCounts[reaction] = (prevCounts[reaction] || 0) + 1;
        }
      }

      const optimistic: WorkReactionSummary = {
        workId,
        totalCount: nextTotal,
        userReaction: nextUserReaction,
        counts: prevCounts,
        reactions: previous?.reactions,
      };

      queryClient.setQueryData<WorkReactionSummary>(queryKey, optimistic);
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
}

/**
 * Explicitly remove reaction from a work listing.
 */
export function useRemoveWorkReaction(workId: string, userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => removeWorkReaction(workId, userId),
    onSuccess: data => {
      queryClient.setQueryData(workReactionKeys.detail(workId, userId), data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: workReactionKeys.detail(workId, userId),
      });
    },
  });
}
