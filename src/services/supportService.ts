/**
 * Support Service
 * Submit support tickets (comments / concerns / suggestions) via the backend API.
 */

import { api } from './api';

export interface SupportTicket {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Save a support ticket for the logged-in user.
 */
export async function submitSupportTicket(
  userId: string,
  message: string,
): Promise<SupportTicket | null> {
  if (!message.trim()) return null;
  return api.post<SupportTicket>('/support', {
    userId,
    message: message.trim(),
  });
}

export type ReportReason = 'harassment' | 'scam' | 'fakery' | 'unsafe' | 'other';

/**
 * Report a user. Creates a support ticket with type = 'report'.
 */
export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  reason: ReportReason,
  message: string,
  workId?: string,
): Promise<SupportTicket> {
  return api.post<SupportTicket>('/support', {
    userId: reporterId,
    message: message.trim(),
    type: 'report',
    reportedUserId,
    reason,
    workId: workId || undefined,
  });
}
