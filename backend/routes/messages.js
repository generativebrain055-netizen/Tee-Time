const { Router } = require("express");
const { body, param } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");
const messageController = require("../controllers/messageController");

const router = Router();

router.use(authenticate);

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
 * Query: limit, before (ISO date for cursor)
 */
router.get(
  "/conversations/:id/messages",
  [param("id").isUUID()],
  validateRequest,
  messageController.getMessages
);

/**
 * POST /api/messages/conversations/:id/messages
 * Body: { body: string }
 */
router.post(
  "/conversations/:id/messages",
  [
    param("id").isUUID(),
    body("body").trim().notEmpty().isLength({ max: 10000 }),
  ],
  validateRequest,
  messageController.sendMessage
);

module.exports = router;
