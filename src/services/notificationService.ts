/**
 * Notification Service
 * Data layer for fetching and modifying user notifications via the backend API.
 */

import type { NotificationItem } from '../types';
import { api } from './api';

/**
 * Fetch all notifications for the logged-in user.
 */
export async function fetchNotifications(): Promise<NotificationItem[]> {
  return api.get<NotificationItem[]>('/notifications');
}

/**
 * Fetch unread count for the logged-in user.
 */
export async function fetchNotificationUnreadCount(): Promise<{
  count: number;
}> {
  return api.get<{ count: number }>('/notifications/unread-count');
}

/**
 * Mark a specific notification as read.
 */
export async function markNotificationRead(
  id: string,
): Promise<NotificationItem> {
  return api.patch<NotificationItem>(`/notifications/${id}/read`, {});
}

/**
 * Mark all notifications for the user as read.
 */
export async function markAllNotificationsRead(): Promise<void> {
  return api.patch<void>('/notifications/read-all', {});
}

/**
 * Fetch messages unread count for the logged-in user.
 */
export async function fetchNotificationMessagesUnreadCount(): Promise<{
  count: number;
}> {
  return api.get<{ count: number }>('/notifications/messages-unread-count');
}

/**
 * Mark all messages notifications as read.
 */
export async function markAllMessagesNotificationsRead(): Promise<void> {
  return api.patch<void>('/notifications/messages-read-all', {});
}
