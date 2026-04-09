const { Router } = require("express");
const { body, param } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");
const messageController = require("../controllers/messageController");

const router = Router();

router.use(authenticate);

/**
 * GET /api/messages/unread-count
 * Returns { total, byConversation: { [id]: number } }
 */
router.get("/unread-count", messageController.getUnreadCount);

/**
 * GET /api/messages/conversations
 * Query: type (optional) - direct | tee_time | group
 */
router.get("/conversations", messageController.listConversations);

/**
 * POST /api/messages/conversations
 * Body: { conversationId?, recipientId?, teeTimeId?, rosterGroupId? }
 */
router.post(
  "/conversations",
  [
    body("conversationId").optional().isUUID(),
    body("recipientId").optional().isUUID(),
    body("teeTimeId").optional().isUUID(),
    body("rosterGroupId").optional().isUUID(),
  ],
  validateRequest,
  messageController.getOrCreateConversation
);

/**
 * GET /api/messages/conversations/:id/messages
 * Query: limit, before (ISO date for cursor), markRead=true
 */
router.get(
  "/conversations/:id/messages",
  [param("id").isUUID()],
  validateRequest,
  messageController.getMessages
);

/**
 * POST /api/messages/conversations/:id/read
 * Mark conversation as read for current user.
 */
router.post(
  "/conversations/:id/read",
  [param("id").isUUID()],
  validateRequest,
  messageController.markRead
);

/**
 * PATCH /api/messages/conversations/:id/mute
 * Body: { muted: true | false }
 */
router.patch(
  "/conversations/:id/mute",
  [
    param("id").isUUID(),
    body("muted").custom((value) => {
      if (value === undefined || value === null) {
        throw new Error("muted is required");
      }
      if (value === true || value === false) return true;
      if (value === "true" || value === "false") return true;
      if (value === 1 || value === 0) return true;
      if (value === "1" || value === "0") return true;
      throw new Error("muted must be a boolean");
    }),
  ],
  validateRequest,
  messageController.setMuted
);

/**
 * POST /api/messages/conversations/:id/leave
 * Hide chat from user's list (does not delete for others).
 */
router.post(
  "/conversations/:id/leave",
  [param("id").isUUID()],
  validateRequest,
  messageController.leaveConversation
);

/**
 * POST /api/messages/conversations/:id/messages
 * Body: { body?, imageBase64?, fileBase64?, fileName?, fileMime? } — at least one of body / image / file
 */
router.post(
  "/conversations/:id/messages",
  [
    param("id").isUUID(),
    body("body").optional().isString().isLength({ max: 10000 }),
    body("imageBase64").optional().isString(),
    body("fileBase64").optional().isString(),
    body("fileName").optional().isString().isLength({ max: 500 }),
    body("fileMime").optional().isString().isLength({ max: 200 }),
  ],
  validateRequest,
  messageController.sendMessage
);

/**
 * POST /api/messages/conversations/:id/messages/:messageId/convert-to-group
 * Turn an auto-generated tee time message into a group message (claim as current user's message).
 */
router.post(
  "/conversations/:id/messages/:messageId/convert-to-group",
  [param("id").isUUID(), param("messageId").isUUID()],
  validateRequest,
  messageController.convertToGroupMessage
);

/**
 * PATCH /api/messages/conversations/:id/messages/:messageId
 * Body: { body: string } — edit message text (sender only).
 */
router.patch(
  "/conversations/:id/messages/:messageId",
  [
    param("id").isUUID(),
    param("messageId").isUUID(),
    body("body").optional().isString().isLength({ max: 10000 }),
  ],
  validateRequest,
  messageController.updateMessage
);

/**
 * DELETE /api/messages/conversations/:id/messages/:messageId
 * Delete a message (sender or tee time organizer).
 */
router.delete(
  "/conversations/:id/messages/:messageId",
  [param("id").isUUID(), param("messageId").isUUID()],
  validateRequest,
  messageController.deleteMessage
);

module.exports = router;
