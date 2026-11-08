/**
 * useComments
 * React Query hooks for work comments.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WorkComment } from '../types';
import {
  fetchComments,
  createComment,
  deleteComment,
  likeComment,
  unlikeComment,
} from '../services/commentService';

// ─── Query keys ───────────────────────────────────────────────

export const commentKeys = {
  all: ['comments'] as const,
  list: (workId: string) => [...commentKeys.all, 'list', workId] as const,
};

// ─── Hooks ────────────────────────────────────────────────────

/**
 * Fetch all comments for a work.
 */
export function useComments(workId: string | undefined) {
  return useQuery({
    queryKey: commentKeys.list(workId || ''),
    queryFn: () => fetchComments(workId!),
    enabled: !!workId,
    staleTime: 15_000,
    // Degrade gracefully when the backend endpoint doesn't exist yet
    retry: false,
  });
}

/**
 * Post a new comment. Optimistically inserts into the list.
 */
export function usePostComment(workId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => createComment(workId, text),
    onMutate: async (text: string) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(workId) });
      const previous = queryClient.getQueryData<WorkComment[]>(
        commentKeys.list(workId),
      );
      const optimistic: WorkComment = {
        id: `optimistic-${Date.now()}`,
        workId,
        authorId: '__optimistic__',
        authorName: 'You',
        authorPhoto: null,
        text,
        likeCount: 0,
        likedByMe: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<WorkComment[]>(commentKeys.list(workId), old => [
        optimistic,
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (_err, _text, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(commentKeys.list(workId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(workId) });
    },
  });
}

/**
 * Delete one of the current user's comments. Optimistically removes it.
 */
export function useDeleteComment(workId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(workId, commentId),
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(workId) });
      const previous = queryClient.getQueryData<WorkComment[]>(
        commentKeys.list(workId),
      );
      queryClient.setQueryData<WorkComment[]>(commentKeys.list(workId), old =>
        (old ?? []).filter(c => c.id !== commentId),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(commentKeys.list(workId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(workId) });
    },
  });
}

/**
 * Toggle a like on a comment. Optimistically updates likeCount + likedByMe.
 */
export function useToggleLike(workId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, liked }: { commentId: string; liked: boolean }) =>
      liked ? unlikeComment(workId, commentId) : likeComment(workId, commentId),
    onMutate: async ({
      commentId,
      liked,
    }: {
      commentId: string;
      liked: boolean;
    }) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(workId) });
      const previous = queryClient.getQueryData<WorkComment[]>(
        commentKeys.list(workId),
      );
      queryClient.setQueryData<WorkComment[]>(commentKeys.list(workId), old =>
        (old ?? []).map(c =>
          c.id === commentId
            ? {
                ...c,
                likedByMe: !liked,
                likeCount: liked
                  ? Math.max(0, c.likeCount - 1)
                  : c.likeCount + 1,
              }
            : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(commentKeys.list(workId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(workId) });
    },
  });
}
