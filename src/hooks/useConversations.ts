/**
 * React Query hooks for messaging operations.
 * Every lookup uses the persistent DB UUID from the auth store so that
 * conversations are always created with the correct user identifier.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConversationPreview } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import {
  fetchConversations,
  fetchMessages,
  createWorkConversation,
  sendMessage,
  checkExistingWorkConversation,
  markConversationRead,
  fetchMessagingUnreadCount,
  markAllMessagesRead,
  archiveConversation,
  muteConversation,
  pinConversation,
  createGroupConversation,
  CreateGroupConversationParams,
} from '../services/messagingService';

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  list: () => [...conversationKeys.all, 'list'] as const,
  messages: (convId: string) =>
    [...conversationKeys.all, 'messages', convId] as const,
  check: (userId: string, workId: string) =>
    [...conversationKeys.all, 'check', userId, workId] as const,
  unreadCount: (userId: string) =>
    [...conversationKeys.all, 'unreadCount', userId] as const,
};

/**
 * Fetch all conversations for the currently authenticated user.
 * Relies on the DB UUID stored in the auth store.
 */
export function useConversations() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: conversationKeys.list(),
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user?.id,
    staleTime: 3_000,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch the total unread message count for the authenticated user.
 * Driven by the Cassandra `unread_counts_by_user` counter table via
 * GET /messaging/unread-total. Polls on an interval so the tab-bar badge
 * stays fresh while the app is open.
 */
export function useMessagingUnreadCount() {
  const { isAuthenticated, user } = useAuthStore();

  return useQuery({
    queryKey: conversationKeys.unreadCount(user?.id || ''),
    queryFn: fetchMessagingUnreadCount,
    enabled: isAuthenticated && !!user?.id,
    staleTime: 10_000,
    refetchInterval: 15_000, // auto refetch count every 15s to keep navigation badge fresh
  });
}

/**
 * Check whether a work-linked conversation already exists for the
 * current user and a given work. Returns { exists, conversationId? }.
 */
export function useCheckExistingWorkConversation(workId: string | undefined) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['conversation', user?.id, workId],
    queryFn: () =>
      checkExistingWorkConversation({
        userId: user!.id,
        workId: workId!,
      }),
    // Fire the check as soon as userId + workId are known — no need to wait
    // for the full work object to load (the API only needs these two IDs).
    enabled: !!user?.id && !!workId,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Fetch messages for a specific conversation.
 */
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.messages(conversationId!),
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 3_000,
    refetchInterval: 10_000,
  });
}

/**
 * Create a new conversation.
 * Automatically invalidates the conversation list on success.
 */
export function useCreateWorkConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      postedBy: string;
      workId: string;
    }) => createWorkConversation(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
    },
  });
}

/**
 * Send a message in an existing conversation.
 * Invalidates the message list for that conversation on success.
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { senderId: string; content: string }) => {
      return sendMessage({
        conversationId,
        ...params,
      });
    },
    onMutate: async () => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: conversationKeys.messages(conversationId),
      });
      await queryClient.cancelQueries({ queryKey: conversationKeys.list() });

      // Snapshot the previous values
      // const previousMessages = queryClient.getQueryData<ConversationMessage[]>(
      //   conversationKeys.messages(conversationId),
      // );
      // const previousList = queryClient.getQueryData<ConversationPreview[]>(
      //   conversationKeys.list(),
      // );

      // Optimistically update the message list
      // const optimisticMessage: ConversationMessage = {
      //   id: `optimistic-${Math.random().toString(36).substring(7)}`,
      //   conversationId,
      //   senderId: newMessage.senderId,
      //   content: newMessage.content,
      //   createdAt: new Date().toISOString(),
      // };

      // if (previousMessages) {
      //   queryClient.setQueryData<ConversationMessage[]>(
      //     conversationKeys.messages(conversationId),
      //     [...previousMessages, optimisticMessage],
      //   );
      // } else {
      //   queryClient.setQueryData<ConversationMessage[]>(
      //     conversationKeys.messages(conversationId),
      //     [optimisticMessage],
      //   );
      // }

      // // Optimistically update the conversation list (inbox preview)
      // if (previousList) {
      //   queryClient.setQueryData<ConversationPreview[]>(
      //     conversationKeys.list(),
      //     previousList.map(c =>
      //       c.id === conversationId
      //         ? {
      //             ...c,
      //             lastMessage: newMessage.content,
      //             lastMessageAt: new Date().toISOString(),
      //             createdAt: new Date().toISOString(),
      //           }
      //         : c,
      //     ),
      //   );
      // }

      // return { previousMessages, previousList };
    },
    // onError: (err, newMessage, context) => {
    // Roll back to the previous states on error
    // if (context?.previousMessages) {
    //   queryClient.setQueryData(
    //     conversationKeys.messages(conversationId),
    //     context.previousMessages,
    //   );
    // }
    // if (context?.previousList) {
    //   queryClient.setQueryData(conversationKeys.list(), context.previousList);
    // }
    // },
    onSettled: () => {
      // Always refetch after success or error to get authoritative state
      queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
    },
  });
}

/**
 * Mark all messages in a conversation as read for the current user.
 * Optimistically updates the conversation list cache to set unreadCount to 0,
 * then invalidates the list in the background for a fresh server state.
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { conversationId: string; userId: string }) => {
      return markConversationRead(params.conversationId, params.userId);
    },
    onMutate: async ({ conversationId }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: conversationKeys.list() });

      // Snapshot the previous list for rollback
      const previousList = queryClient.getQueryData<ConversationPreview[]>(
        conversationKeys.list(),
      );

      // Optimistically set unreadCount to 0 for the opened conversation
      if (previousList) {
        queryClient.setQueryData<ConversationPreview[]>(
          conversationKeys.list(),
          previousList.map(c =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c,
          ),
        );
      }

      return { previousList };
    },
    onError: (_err, _vars, context) => {
      // Roll back to the previous state on error
      if (context?.previousList) {
        queryClient.setQueryData(conversationKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      // Always refetch the list to get authoritative state
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
    },
  });
}

/**
 * Mark all messages as read for the current user (resets every Cassandra
 * per-conversation unread counter). Optimistically zeroes the tab-bar badge,
 * invalidates the conversation list, then refetches the authoritative count.
 */
export function useMarkAllMessagesRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: markAllMessagesRead,
    onMutate: async () => {
      if (!user?.id) return;

      // Cancel any outgoing refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({
        queryKey: conversationKeys.unreadCount(user.id),
      });

      const previous = queryClient.getQueryData<{ count: number }>(
        conversationKeys.unreadCount(user.id),
      );

      // Optimistically hide the badge and zero per-conversation unread counts
      queryClient.setQueryData(conversationKeys.unreadCount(user.id), {
        count: 0,
      });
      const previousList = queryClient.getQueryData<ConversationPreview[]>(
        conversationKeys.list(),
      );
      if (previousList) {
        queryClient.setQueryData<ConversationPreview[]>(
          conversationKeys.list(),
          previousList.map(c => ({ ...c, unreadCount: 0 })),
        );
      }

      return { previous, previousList };
    },
    onError: (_err, _vars, context) => {
      // Roll back to the previous state on error
      if (user?.id && context?.previous) {
        queryClient.setQueryData(
          conversationKeys.unreadCount(user.id),
          context.previous,
        );
      }
      if (context?.previousList) {
        queryClient.setQueryData(conversationKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (user?.id) {
        // Always refetch to get authoritative state
        queryClient.invalidateQueries({
          queryKey: conversationKeys.unreadCount(user.id),
        });
        queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
      }
    },
  });
}

/**
 * Archive a conversation for the current user (hides it from the inbox).
 * Optimistically marks the conversation as archived in the list cache, then
 * invalidates the list in the background for a fresh server state.
 */
export function useArchiveConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      return archiveConversation(conversationId, user!.id);
    },
    onMutate: async conversationId => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: conversationKeys.list() });

      const previousList = queryClient.getQueryData<ConversationPreview[]>(
        conversationKeys.list(),
      );

      // Optimistically mark the conversation as archived (hidden)
      if (previousList) {
        queryClient.setQueryData<ConversationPreview[]>(
          conversationKeys.list(),
          previousList.map(c =>
            c.id === conversationId ? { ...c, isArchived: true } : c,
          ),
        );
      }

      return { previousList };
    },
    onError: (_err, _vars, context) => {
      // Roll back to the previous state on error
      if (context?.previousList) {
        queryClient.setQueryData(conversationKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      // Always refetch the list to get authoritative state
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
    },
  });
}

/**
 * Mute (or unmute) push notifications for a conversation for the current user.
 * Optimistically updates the conversation list cache to set isMuted, then
 * invalidates the list in the background for a fresh server state.
 */
export function useMuteConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (params: { conversationId: string; muted: boolean }) => {
      return muteConversation(params.conversationId, user!.id, params.muted);
    },
    onMutate: async ({ conversationId, muted }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: conversationKeys.list() });

      const previousList = queryClient.getQueryData<ConversationPreview[]>(
        conversationKeys.list(),
      );

      // Optimistically set the muted state for the conversation
      if (previousList) {
        queryClient.setQueryData<ConversationPreview[]>(
          conversationKeys.list(),
          previousList.map(c =>
            c.id === conversationId ? { ...c, isMuted: muted } : c,
          ),
        );
      }

      return { previousList };
    },
    onError: (_err, _vars, context) => {
      // Roll back to the previous state on error
      if (context?.previousList) {
        queryClient.setQueryData(conversationKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      // Always refetch the list to get authoritative state
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
    },
  });
}

/**
 * Pin (or unpin) a conversation for the current user.
 * Optimistically updates the conversation list cache to set isPinned, then
 * invalidates the list in the background for a fresh server state.
 */
export function usePinConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (params: { conversationId: string; pinned: boolean }) => {
      return pinConversation(params.conversationId, user!.id, params.pinned);
    },
    onMutate: async ({ conversationId, pinned }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: conversationKeys.list() });

      const previousList = queryClient.getQueryData<ConversationPreview[]>(
        conversationKeys.list(),
      );

      // Optimistically set the pinned state for the conversation
      if (previousList) {
        queryClient.setQueryData<ConversationPreview[]>(
          conversationKeys.list(),
          previousList.map(c =>
            c.id === conversationId ? { ...c, isPinned: pinned } : c,
          ),
        );
      }

      return { previousList };
    },
    onError: (_err, _vars, context) => {
      // Roll back to the previous state on error
      if (context?.previousList) {
        queryClient.setQueryData(conversationKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      // Always refetch the list to get authoritative state
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
    },
  });
}

/**
 * Create a new group conversation with multiple participants.
 * Automatically invalidates the conversation list on success.
 */
export function useCreateGroupConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateGroupConversationParams) =>
      createGroupConversation(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
    },
  });
}
