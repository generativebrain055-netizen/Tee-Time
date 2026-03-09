const conversationRepository = require("../repositories/conversationRepository");
const messageRepository = require("../repositories/messageRepository");

/**
 * Get or create a conversation and return it with metadata.
 * For ChatDetail screen: conversationId can be passed from client, or create from recipientId / teeTimeId / groupId.
 */
async function getOrCreateConversation(userId, params) {
  const { conversationId, recipientId, teeTimeId, rosterGroupId } = params;

  if (conversationId) {
    const conv = await conversationRepository.getById(conversationId, userId);
    if (conv) {
      await conversationRepository.ensureParticipant(conversationId, userId);
      return conv;
    }
  }

  if (recipientId) {
    const conv = await conversationRepository.getOrCreateDirectConversation(
      userId,
      recipientId
    );
    return conversationRepository.getById(conv.id, userId);
  }

  if (teeTimeId) {
    const conv = await conversationRepository.getOrCreateTeeTimeConversation(
      userId,
      teeTimeId
    );
    return conversationRepository.getById(conv.id, userId);
  }

  if (rosterGroupId) {
    const conv = await conversationRepository.getOrCreateGroupConversation(
      userId,
      rosterGroupId
    );
    return conversationRepository.getById(conv.id, userId);
  }

  throw new Error("Provide conversationId, recipientId, teeTimeId, or rosterGroupId");
}

/**
 * List conversations for the current user (All, or filtered by type).
 */
async function listConversations(userId, type) {
  return conversationRepository.listForUser(userId, { type });
}

/**
 * Get messages for a conversation. Returns messages with sender display info.
 * If options.markRead is true, updates the user's last_read_at for this conversation.
 */
async function getMessages(conversationId, userId, options = {}) {
  await conversationRepository.ensureParticipant(conversationId, userId);
  if (options.markRead) {
    await conversationRepository.markConversationRead(conversationId, userId);
  }
  const rows = await messageRepository.listByConversation(conversationId, options);
  const senderIds = [...new Set(rows.map((m) => m.sender_id).filter(Boolean))];
  const senders = await messageRepository.getSendersInfo(senderIds);

  return rows.map((m) => {
    const isSystem = m.sender_id == null;
    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: isSystem ? "Tee Time Social" : (senders[m.sender_id]?.name || "Unknown"),
      senderImg: isSystem ? "" : (senders[m.sender_id]?.avatarUrl || ""),
      message: m.body,
      imageUrl: m.image_url || null,
      time: formatMessageTime(m.created_at),
      createdAt: m.created_at,
      isMe: m.sender_id === userId,
    };
  });
}

/**
 * Send a message in a conversation.
 * @param {string} [imageUrl] - Optional public URL of attached image
 */
async function sendMessage(conversationId, userId, body, imageUrl = null) {
  await conversationRepository.ensureParticipant(conversationId, userId);
  const msg = await messageRepository.create(conversationId, userId, body, imageUrl);
  const senders = await messageRepository.getSendersInfo([userId]);
  return {
    id: msg.id,
    conversationId: msg.conversation_id,
    senderId: msg.sender_id,
    senderName: senders[userId]?.name || "You",
    senderImg: senders[userId]?.avatarUrl || "",
    message: msg.body,
    imageUrl: msg.image_url || null,
    time: formatMessageTime(msg.created_at),
    createdAt: msg.created_at,
    isMe: true,
  };
}

function formatMessageTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Get unread message counts for the current user (total and per conversation).
 */
async function getUnreadCounts(userId) {
  return conversationRepository.getUnreadCounts(userId);
}

/**
 * Mark a conversation as read for the current user.
 */
async function markConversationRead(conversationId, userId) {
  return conversationRepository.markConversationRead(conversationId, userId);
}

module.exports = {
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
  getUnreadCounts,
  markConversationRead,
};
