import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import {
  fetchNotifications,
  fetchNotificationUnreadCount,
  fetchNotificationMessagesUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  markAllMessagesNotificationsRead,
} from '../services/notificationService';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  unreadCount: (userId: string) =>
    [...notificationKeys.all, 'unreadCount', userId] as const,
  messagesUnreadCount: (userId: string) =>
    [...notificationKeys.all, 'messagesUnreadCount', userId] as const,
};

/**
 * Hook to fetch notifications list.
 */
export function useNotifications() {
  const { isAuthenticated, user } = useAuthStore();

  return useQuery({
    queryKey: notificationKeys.list(user?.id || ''),
    queryFn: fetchNotifications,
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch notifications unread count.
 */
export function useNotificationUnreadCount() {
  const { isAuthenticated, user } = useAuthStore();

  return useQuery({
    queryKey: notificationKeys.unreadCount(user?.id || ''),
    queryFn: fetchNotificationUnreadCount,
    enabled: isAuthenticated && !!user?.id,
    staleTime: 10_000,
    refetchInterval: 15_000, // auto refetch count every 15s to keep navigation badge fresh
  });
}

/**
 * Hook to fetch messages notifications unread count.
 */
export function useNotificationMessagesUnreadCount() {
  const { isAuthenticated, user } = useAuthStore();

  return useQuery({
    queryKey: notificationKeys.messagesUnreadCount(user?.id || ''),
    queryFn: fetchNotificationMessagesUnreadCount,
    enabled: isAuthenticated && !!user?.id,
    staleTime: 10_000,
    refetchInterval: 15_000, // auto refetch count every 15s to keep navigation badge fresh
  });
}

/**
 * Hook to mark a specific notification as read.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(user.id),
        });
      }
    },
  });
}

/**
 * Hook to mark all notifications as read.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(user.id),
        });
      }
    },
  });
}

/**
 * Hook to mark all message notifications as read.
 * Invalidates both the general read count and messages-specific read count.
 */
export function useMarkAllMessagesNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: markAllMessagesNotificationsRead,
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: notificationKeys.messagesUnreadCount(user.id),
        });
      }
    },
  });
}