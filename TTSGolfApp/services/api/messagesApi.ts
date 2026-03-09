/**
 * Messages API – conversations and chat
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";

export type ConversationType = "direct" | "tee_time" | "group";

export interface ConversationListItem {
  id: string;
  type: ConversationType;
  tee_time_id?: string;
  roster_group_id?: string;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  otherUserId?: string | null;
  participantInitials?: string | null;
  participantAvatars?: string[];
  participantCount?: number | null;
  lastMessage?: {
    body: string;
    created_at: string;
    sender_id: string;
  } | null;
  unreadCount?: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderName: string;
  senderImg: string;
  message: string;
  imageUrl?: string | null;
  time: string;
  createdAt: string;
  isMe: boolean;
  /** True for auto-generated tee time messages (e.g. Tee Time Social welcome) */
  isSystem?: boolean;
}

export interface GetOrCreateConversationParams {
  conversationId?: string;
  recipientId?: string;
  teeTimeId?: string;
  rosterGroupId?: string;
}

export const messagesApi = {
  /** List conversations (optional filter by type) */
  listConversations: (type?: ConversationType) => {
    const url = type
      ? `${API_ENDPOINTS.MESSAGES_CONVERSATIONS}?type=${type}`
      : API_ENDPOINTS.MESSAGES_CONVERSATIONS;
    return apiCall<{ success: boolean; conversations: ConversationListItem[] }>(
      url
    );
  },

  /** Get or create a conversation; returns full conversation for header */
  getOrCreateConversation: (params: GetOrCreateConversationParams) =>
    apiCall<{ success: boolean; conversation: ConversationListItem }>(
      API_ENDPOINTS.MESSAGES_CONVERSATIONS,
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    ),

  /** Get messages in a conversation (markRead=true marks conversation as read) */
  getMessages: (
    conversationId: string,
    options?: { limit?: number; before?: string; markRead?: boolean }
  ) => {
    const q = new URLSearchParams();
    if (options?.limit) q.set("limit", String(options.limit));
    if (options?.before) q.set("before", options.before);
    if (options?.markRead) q.set("markRead", "true");
    const query = q.toString();
    const url = API_ENDPOINTS.MESSAGES_CONVERSATION_MESSAGES(conversationId) + (query ? `?${query}` : "");
    return apiCall<{ success: boolean; messages: ChatMessage[] }>(url);
  },

  /** Get total and per-conversation unread message counts */
  getUnreadCount: () =>
    apiCall<{ success: boolean; total: number; byConversation: Record<string, number> }>(
      API_ENDPOINTS.MESSAGES_UNREAD_COUNT
    ),

  /** Mark a conversation as read */
  markConversationRead: (conversationId: string) =>
    apiCall<{ success: boolean }>(API_ENDPOINTS.MESSAGES_MARK_READ(conversationId), {
      method: "POST",
    }),

  /** Send a message (text and/or image). For image-only, pass body as "" and imageBase64. */
  sendMessage: (
    conversationId: string,
    body: string,
    imageBase64?: string
  ) =>
    apiCall<{ success: boolean; message: ChatMessage }>(
      API_ENDPOINTS.MESSAGES_SEND_MESSAGE(conversationId),
      {
        method: "POST",
        body: JSON.stringify(
          imageBase64 ? { body: body.trim(), imageBase64 } : { body: body.trim() }
        ),
      }
    ),

  /** Turn an auto-generated tee time message into a group message (claim as current user's). */
  convertToGroupMessage: (conversationId: string, messageId: string) =>
    apiCall<{ success: boolean; message: ChatMessage }>(
      API_ENDPOINTS.MESSAGES_CONVERT_TO_GROUP(conversationId, messageId),
      { method: "POST" }
    ),

  /** Delete a message (allowed for sender or tee time organizer). */
  deleteMessage: (conversationId: string, messageId: string) =>
    apiCall<{ success: boolean }>(
      API_ENDPOINTS.MESSAGES_DELETE_MESSAGE(conversationId, messageId),
      { method: "DELETE" }
    ),
};
