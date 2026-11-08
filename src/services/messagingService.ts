/**
 * Messaging Service
 * Data layer for messaging operations via the backend NestJS API.
 * Conversations and messages are stored in Cassandra via Stargate CQL.
 */

import type { ConversationPreview, ConversationMessage } from '../types';
import { usePresenceStore } from '../store';
import { api } from './api';

// ---------------------------------------------------------------------------
// Backend API types (matching Cassandra CQL table schemas)
// ---------------------------------------------------------------------------

/** Response from POST /messaging/conversations */
interface ApiConversationDetail {
  metadata: {
    conversation_id: string;
    created_at: string;
    created_by: string;
    conversation_name: string;
    is_group: boolean;
  };
  participants: string[];
}

/** Response from GET /messaging/conversations?userId= */
interface ApiConversationListItem {
  user_id: string;
  last_message_time: string;
  conversation_id: string;
  conversation_name: string;
  conversation_photo?: string | null;

  last_message_body: string;
  is_group: boolean;
  unread_count: number;
  work_id?: string | null;
  is_archived?: boolean | null;
  is_muted?: boolean | null;
  is_pinned?: boolean | null;
  partner?: {
    id: string;
    name: string;
    photo: string | null;
    phone?: string | null;
    email?: string | null;
    isOnline?: boolean;
    status?: string;
  };
}

/** Response from GET /messaging/messages/:conversationId */
interface ApiMessageResponse {
  messages: ApiMessageRow[];
  pageState?: string | null;
}

interface ApiMessageRow {
  conversation_id: string;
  message_id: string;
  sender_id: string;
  message_body: string;
  created_at: string;
  attachments?: string[];
  sender_name?: string;
  sender_photo?: string | null;
}

/** Response from POST /messaging/messages */
interface ApiSendMessageResponse {
  conversation_id: string;
  message_id: string;
  sender_id: string;
  message_body: string;
  created_at: string;
  attachments?: string[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new conversation between users, with an optional first message.
 * Returns the created conversation ID.
 */
export async function createWorkConversation(params: {
  userId: string;
  workId: string;
}): Promise<string> {
  const result = await api.post<ApiConversationDetail>(
    '/messaging/conversations',
    params,
  );
  return result.metadata.conversation_id;
}

/**
 * Check whether a work-linked conversation already exists between two users.
 * Calls GET /messaging/conversations/check?userId=&postedBy=&workId=
 */

export async function checkExistingWorkConversation(params: {
  userId: string;
  workId: string;
}): Promise<{ conversation_id?: string } | null> {
  if (!params?.userId) return null;
  if (!params?.workId) return null;

  const qs = new URLSearchParams({
    userId: params.userId,
    workId: params.workId,
  });

  console.log('called again!', params?.userId, params?.workId);
  return api.get<{ conversation_id?: string } | null>(
    `/messaging/conversations/check?${qs.toString()}`,
  );
}

/**
 * Fetch all conversations for a user.
 */
export async function fetchConversations(
  userId: string,
): Promise<ConversationPreview[]> {
  const result = await api.get<ApiConversationListItem[]>(
    `/messaging/conversations?userId=${encodeURIComponent(userId)}`,
  );
  const convos = (result || []).map(mapApiConversation);

  // Sync initial partner presences into usePresenceStore
  for (const c of convos) {
    if (c.partner?.id && c.partner.isOnline !== undefined) {
      usePresenceStore
        .getState()
        .setPresence(c.partner.id, c.partner.isOnline, c.partner.status);
    }
  }

  return convos;
}

/**
 * Fetch messages for a specific conversation.
 */
export async function fetchMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const result = await api.get<ApiMessageResponse>(
    `/messaging/messages/${encodeURIComponent(conversationId)}`,
  );
  return result.messages.map(mapApiMessage);
}

/**
 * Send a message in an existing conversation.
 */
export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  receiverId?: string;
  content: string;
}): Promise<ConversationMessage> {
  const result = await api.post<ApiSendMessageResponse>('/messaging/messages', {
    conversationId: params.conversationId,
    senderId: params.senderId,
    ...(params.receiverId ? { receiverId: params.receiverId } : {}),
    content: params.content,
  });
  return {
    id: result.message_id,
    conversationId: result.conversation_id,
    senderId: result.sender_id,
    content: result.message_body,
    createdAt: result.created_at,
    attachments: result.attachments,
  };
}

/**
 * Mark all messages in a conversation as read for the current user.
 * Calls PATCH /messaging/messages/read
 */
export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  await api.patch<void>('/messaging/messages/read', {
    conversationId,
    userId,
  });
}

/**
 * Fetch the total unread message count for the authenticated user.
 * Sourced from the Cassandra `unread_counts_by_user` counter table.
 * Calls GET /messaging/unread-total (uses the JWT to identify the user).
 */
export async function fetchMessagingUnreadCount(): Promise<{
  count: number;
}> {
  return api.get<{ count: number }>('/messaging/unread-total');
}

/**
 * Mark all messages as read for the authenticated user, resetting every
 * per-conversation counter in Cassandra's `unread_counts_by_user`.
 * Calls PATCH /messaging/messages/read-all
 */
export async function markAllMessagesRead(): Promise<void> {
  await api.patch<void>('/messaging/messages/read-all', {});
}

/**
 * Archive a conversation for a user (hides it from their inbox).
 * Calls PATCH /messaging/conversations/archive
 */
export async function archiveConversation(
  conversationId: string,
  userId: string,
): Promise<void> {
  await api.patch<void>('/messaging/conversations/archive', {
    conversationId,
    userId,
  });
}

/**
 * Mute (or unmute) push notifications for a conversation for a user.
 * Calls PATCH /messaging/conversations/mute
 */
export async function muteConversation(
  conversationId: string,
  userId: string,
  muted: boolean,
): Promise<void> {
  await api.patch<void>('/messaging/conversations/mute', {
    conversationId,
    userId,
    muted,
  });
}

/**
 * Pin (or unpin) a conversation for a user so it stays at the top of the inbox.
 * Calls PATCH /messaging/conversations/pin
 */
export async function pinConversation(
  conversationId: string,
  userId: string,
  pinned: boolean,
): Promise<void> {
  await api.patch<void>('/messaging/conversations/pin', {
    conversationId,
    userId,
    pinned,
  });
}

/**
 * Fetch full conversation detail including participants list.
 * Calls GET /messaging/conversations/:id
 */
export async function fetchConversationDetail(
  conversationId: string,
): Promise<ApiConversationDetail> {
  return api.get<ApiConversationDetail>(
    `/messaging/conversations/${encodeURIComponent(conversationId)}`,
  );
}

/**
 * Check whether a direct conversation (workId is null) exists between two users.
 * Calls GET /messaging/conversations/check-direct?userId=&partnerId=
 */
export async function checkExistingConversation(params: {
  userId: string;
  partnerId: string;
}): Promise<{ conversation_id?: string } | null> {
  if (!params?.userId || !params?.partnerId) return null;

  const qs = new URLSearchParams({
    userId: params.userId,
    partnerId: params.partnerId,
  });

  return api.get<{ conversation_id?: string } | null>(
    `/messaging/conversations/check-direct?${qs.toString()}`,
  );
}

/**
 * Create a new direct 1:1 conversation between two users without specific work association.
 * Calls POST /messaging/conversations/direct
 */
export async function createConversation(params: {
  userId: string;
  partnerId: string;
  firstMessage?: string;
}): Promise<string> {
  const result = await api.post<ApiConversationDetail>(
    '/messaging/conversations/direct',
    params,
  );
  return result.metadata.conversation_id;
}

export interface CreateGroupConversationParams {
  userId: string;
  participantIds: string[];
  title?: string;
  workId?: string;
  firstMessage?: string;
}

/**
 * Create a new group conversation with multiple participants.
 * Calls POST /messaging/conversations/group
 */
export async function createGroupConversation(
  params: CreateGroupConversationParams,
): Promise<{ conversationId: string; title: string }> {
  try {
    const result = await api.post<ApiConversationDetail>(
      '/messaging/conversations/group',
      params,
    );
    return {
      conversationId: result.metadata.conversation_id,
      title: result.metadata.conversation_name,
    };
  } catch (error: any) {
    // Graceful fallback if backend endpoint isn't deployed yet (404)
    if (error?.status === 404) {
      const otherId = params.participantIds.find(p => p !== params.userId);
      if (otherId) {
        const fallbackId = await createConversation({
          userId: params.userId,
          partnerId: otherId,
          firstMessage: params.firstMessage,
        });
        return {
          conversationId: fallbackId,
          title: params.title || 'Group Chat',
        };
      }
    }
    throw error;
  }
}

/**
 * Fetch a user's profile by ID.
 * Calls GET /users/:id
 */
export async function fetchUserProfile(
  userId: string,
): Promise<{ id: string; name: string; photo: string | null }> {
  return api.get<{ id: string; name: string; photo: string | null }>(
    `/users/${encodeURIComponent(userId)}`,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapApiConversation(api: ApiConversationListItem): ConversationPreview {
  return {
    id: api.conversation_id,
    userId: api.user_id,

    photo: api.conversation_photo ?? null,

    title: api.conversation_name || null,
    lastMessage: api.last_message_body || null,
    lastMessageAt: api.last_message_time || null,
    createdAt: api.last_message_time, // best available timestamp
    partner: api.partner ?? { id: '', name: 'Unknown', photo: null },
    participants: [], // populated by the consumer via fetchConversationDetail

    unreadCount: api.unread_count,
    isGroup: api.is_group,
    workId: api.work_id ?? null,
    isArchived: !!api.is_archived,
    isMuted: !!api.is_muted,
    isPinned: !!api.is_pinned,
  };
}

function mapApiMessage(api: ApiMessageRow): ConversationMessage {
  return {
    id: api.message_id,
    conversationId: api.conversation_id,
    senderId: api.sender_id,
    senderName: api.sender_name,
    senderPhoto: api.sender_photo,
    content: api.message_body,
    createdAt: api.created_at,
    attachments: api.attachments,
  };
}
