const messageService = require("../services/messageService");
const chatImageUploadService = require("../services/chatImageUploadService");
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
 * Send a message. Body: { body?: string, imageBase64?: string }
 * At least one of body (non-empty) or imageBase64 is required. Image is uploaded to storage and URL stored.
 */
async function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const { body = "", imageBase64 } = req.body;

    const hasText = typeof body === "string" && body.trim().length > 0;
    const hasImage = typeof imageBase64 === "string" && imageBase64.length > 0;

    if (!hasText && !hasImage) {
      return res.status(400).json({
        success: false,
        message: "Provide message body and/or image (imageBase64)",
      });
    }

    let imageUrl = null;
    if (hasImage) {
      try {
        imageUrl = await chatImageUploadService.uploadChatImage(
          imageBase64,
          conversationId,
          userId
        );
      } catch (uploadErr) {
        logger.error("Chat image upload error:", uploadErr);
        return res.status(400).json({
          success: false,
          message: uploadErr.message || "Failed to upload image",
        });
      }
    }

    const message = await messageService.sendMessage(
      conversationId,
      userId,
      (body || "").trim(),
      imageUrl
    );
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

/**
 * POST /api/messages/conversations/:id/messages/:messageId/convert-to-group
 * Turn an auto-generated tee time message (system message) into a group message from the current user.
 */
async function convertToGroupMessage(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId, messageId } = req.params;
    const message = await messageService.convertToGroupMessage(conversationId, messageId, userId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found or not a system message",
      });
    }
    return res.json({ success: true, message });
  } catch (error) {
    logger.error("Convert to group message error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to convert message",
    });
  }
}

/**
 * PATCH /api/messages/conversations/:id/mute
 * Body: { muted: boolean }
 */
function coerceMutedBody(raw) {
  if (raw === true || raw === "true" || raw === 1 || raw === "1") return true;
  return false;
}

async function setMuted(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const muted = coerceMutedBody(req.body?.muted);
    await messageService.setConversationMuted(conversationId, userId, muted);
    return res.json({ success: true, muted });
  } catch (error) {
    logger.error("Set conversation muted error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to update mute",
    });
  }
}

/**
 * POST /api/messages/conversations/:id/leave
 * Remove conversation from user's list (soft leave via left_at).
 */
async function leaveConversation(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    await messageService.leaveConversation(conversationId, userId);
    return res.json({ success: true });
  } catch (error) {
    logger.error("Leave conversation error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to leave conversation",
    });
  }
}

/**
 * DELETE /api/messages/conversations/:id/messages/:messageId
 * Delete a message. Sender always; tee time chats also allow the tee time organizer.
 */
async function deleteMessage(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId, messageId } = req.params;
    const deleted = await messageService.deleteMessage(conversationId, messageId, userId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    return res.json({ success: true });
  } catch (error) {
    if (error.message && error.message.includes("only delete")) {
      return res.status(403).json({ success: false, message: error.message });
    }
    logger.error("Delete message error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete message",
    });
  }
}

module.exports = {
  listConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
  markRead,
  convertToGroupMessage,
  deleteMessage,
  setMuted,
  leaveConversation,
};
