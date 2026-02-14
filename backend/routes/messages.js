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
 * POST /api/messages/conversations/:id/messages
 * Body: { body?: string, imageBase64?: string } — at least one required
 */
router.post(
  "/conversations/:id/messages",
  [
    param("id").isUUID(),
    body("body").optional().isString().isLength({ max: 10000 }),
    body("imageBase64").optional().isString(),
  ],
  validateRequest,
  messageController.sendMessage
);

module.exports = router;
