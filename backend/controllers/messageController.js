const messageService = require("../services/messageService");
const logger = require("../config/logger");

/**
 * GET /api/messages/conversations
 * List conversations for the current user. Query: ?type=direct|tee_time|group (optional)
 */
async function listConversations(req, res) {
  try {
    const userId = req.user.id;
    const type = req.query.type; // optional filter
    const list = await messageService.listConversations(userId, type);
    return res.json({ success: true, conversations: list });
  } catch (error) {
    logger.error("List conversations error:", error);
    return res.status(500).json({ success: false, message: "Failed to load conversations" });
  }
}

/**
 * POST /api/messages/conversations
 * Get or create a conversation. Body: { conversationId?, recipientId?, teeTimeId?, rosterGroupId? }
 * Returns conversation with title, subtitle, avatarUrl, etc. for the chat header.
 */
async function getOrCreateConversation(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId, recipientId, teeTimeId, rosterGroupId } = req.body;
    const conv = await messageService.getOrCreateConversation(userId, {
      conversationId,
      recipientId,
      teeTimeId,
      rosterGroupId,
    });
    return res.json({ success: true, conversation: conv });
  } catch (error) {
    logger.error("Get or create conversation error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to get or create conversation",
    });
  }
}

/**
 * GET /api/messages/conversations/:id/messages
 * List messages in a conversation. Query: ?limit=50&before=ISO date&markRead=true (optional)
 */
async function getMessages(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const before = req.query.before; // ISO string for cursor
    const markRead = req.query.markRead === "true" || req.query.markRead === "1";
    const messages = await messageService.getMessages(conversationId, userId, {
      limit,
      before,
      markRead,
    });
    return res.json({ success: true, messages });
  } catch (error) {
    logger.error("Get messages error:", error);
    return res.status(500).json({ success: false, message: "Failed to load messages" });
  }
}

/**
 * POST /api/messages/conversations/:id/messages
 * Send a message. Body: { body: string }
 */
async function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const { body } = req.body;
    if (!body || typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ success: false, message: "Message body is required" });
    }
    const message = await messageService.sendMessage(conversationId, userId, body);
    return res.status(201).json({ success: true, message });
  } catch (error) {
    logger.error("Send message error:", error);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
}

/**
 * GET /api/messages/unread-count
 * Returns { total, byConversation: { [conversationId]: number } }
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;
    const counts = await messageService.getUnreadCounts(userId);
    return res.json({ success: true, ...counts });
  } catch (error) {
    logger.error("Get unread count error:", error);
    return res.status(500).json({ success: false, message: "Failed to get unread count" });
  }
}

/**
 * POST /api/messages/conversations/:id/read
 * Mark conversation as read for the current user.
 */
async function markRead(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    await messageService.markConversationRead(conversationId, userId);
    return res.json({ success: true });
  } catch (error) {
    logger.error("Mark read error:", error);
    return res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
}

module.exports = {
  listConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
  markRead,
};
