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
  /** Roster group color (hex) when type is group */
  groupColor?: string | null;
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
  /** Per-user mute; unread totals exclude this conversation when true */
  isMuted?: boolean;
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
  /** Non-image file attachment */
  fileUrl?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
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

  /**
   * Send a message (text and/or image and/or file — not image + file together).
   * For a file: pass `file` with base64 + name (+ optional mime from picker).
   */
  sendMessage: (
    conversationId: string,
    body: string,
    imageBase64?: string,
    file?: { base64: string; fileName: string; fileMime?: string }
  ) => {
    const payload: Record<string, string> = { body: body.trim() };
    if (imageBase64) payload.imageBase64 = imageBase64;
    if (file?.base64) {
      payload.fileBase64 = file.base64;
      payload.fileName = file.fileName;
      if (file.fileMime) payload.fileMime = file.fileMime;
    }
    return apiCall<{ success: boolean; message: ChatMessage }>(
      API_ENDPOINTS.MESSAGES_SEND_MESSAGE(conversationId),
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  /** Turn an auto-generated tee time message into a group message (claim as current user's). */
  convertToGroupMessage: (conversationId: string, messageId: string) =>
    apiCall<{ success: boolean; message: ChatMessage }>(
      API_ENDPOINTS.MESSAGES_CONVERT_TO_GROUP(conversationId, messageId),
      { method: "POST" }
    ),

  /** Edit message text (sender only). */
  updateMessage: (conversationId: string, messageId: string, body: string) =>
    apiCall<{ success: boolean; message: ChatMessage }>(
      API_ENDPOINTS.MESSAGES_UPDATE_MESSAGE(conversationId, messageId),
      { method: "PATCH", body: JSON.stringify({ body }) }
    ),

  /** Delete a message (sender; tee time organizer may delete any in tee time chat). */
  deleteMessage: (conversationId: string, messageId: string) =>
    apiCall<{ success: boolean }>(
      API_ENDPOINTS.MESSAGES_DELETE_MESSAGE(conversationId, messageId),
      { method: "DELETE" }
    ),

  /** Mute or unmute this conversation for the current user (unread badge ignores when muted). */
  setConversationMuted: (conversationId: string, muted: boolean) =>
    apiCall<{ success: boolean; muted: boolean }>(
      API_ENDPOINTS.MESSAGES_CONVERSATION_MUTE(conversationId),
      { method: "PATCH", body: JSON.stringify({ muted }) }
    ),

  /** Remove chat from your Messages list (others unaffected; reopen via group/tee time). */
  leaveConversation: (conversationId: string) =>
    apiCall<{ success: boolean }>(
      API_ENDPOINTS.MESSAGES_CONVERSATION_LEAVE(conversationId),
      { method: "POST" }
    ),
};
