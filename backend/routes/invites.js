const { Router } = require("express");
const { body } = require("express-validator");
const inviteController = require("../controllers/invite");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/invites
 * @desc    Create invites for a tee time
 * @access  Private
 */
router.post(
  "/",
  [
    body("teeTimeId").isUUID().withMessage("Valid tee time ID required"),
    body("invitees")
      .isArray({ min: 1, max: 20 })
      .withMessage("invitees must be an array with 1-20 items"),
    body("invitees.*.userId")
      .optional()
      .isUUID()
      .withMessage("Invalid user ID"),
    body("invitees.*.phone")
      .optional()
      .matches(/^\+?[1-9]\d{6,14}$/)
      .withMessage("Invalid phone"),
    body("invitees.*.name").optional().trim(),
  ],
  validateRequest,
  inviteController.createInvites,
);

/**
 * @route   POST /api/invites/from-roster
 * @desc    Create invites from roster
 * @access  Private
 */
router.post(
  "/from-roster",
  [
    body("teeTimeId").isUUID().withMessage("Valid tee time ID required"),
    body("rosterIds")
      .optional()
      .isArray({ max: 50 })
      .withMessage("rosterIds must be an array with max 50 items"),
    body("rosterIds.*")
      .optional()
      .isUUID()
      .withMessage("Each rosterIds item must be a valid UUID"),
    body("count")
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage("Count must be 1-20"),
  ],
  validateRequest,
  inviteController.createFromRoster,
);

/**
 * @route   GET /api/invites/pending
 * @desc    Get pending invites (received)
 * @access  Private
 */
router.get("/pending", inviteController.getPendingInvites);

/**
 * @route   GET /api/invites/sent
 * @desc    Get sent invites
 * @access  Private
 */
router.get("/sent", inviteController.getSentInvites);

/**
 * @route   PUT /api/invites/:id/respond
 * @desc    Respond to an invite (accept/decline/maybe)
 * @access  Private
 * IMPORTANT: This route must come BEFORE /:id route to avoid route conflicts
 */
router.put(
  "/:id/respond",
  [
    body("response")
      .isIn(["accepted", "declined", "maybe"])
      .withMessage("Response must be accepted, declined, or maybe"),
    body("message")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Message too long"),
  ],
  (req, res, next) => {
    // Log request before validation - this confirms the route handler was reached
    const { invitesLogger } = require("../config/logger");
    invitesLogger.info("[INVITE] Request received at respond endpoint route handler", {
      event: "respond_endpoint_route_handler",
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      inviteId: req.params.id,
      userId: req.user?.id,
      response: req.body?.response,
      hasMessage: !!req.body?.message,
      bodyKeys: Object.keys(req.body || {}),
    });
    next();
  },
  validateRequest,
  inviteController.respondToInvite,
);

/**
 * @route   GET /api/invites/:id
 * @desc    Get invite by ID
 * @access  Private
 */
router.get("/:id", inviteController.getInviteById);

/**
 * @route   GET /api/invites/:id
 * @desc    Get invite by ID
 * @access  Private
 */
router.get("/:id", inviteController.getInviteById);

/**
 * @route   GET /api/invites/:id/responses
 * @desc    Get response history for an invite
 * @access  Private
 */
router.get("/:id/responses", inviteController.getInviteResponses);

/**
 * @route   GET /api/invites/history
 * @desc    Get user's response history
 * @access  Private
 */
router.get("/history", inviteController.getUserResponseHistory);

/**
 * @route   DELETE /api/invites/:id
 * @desc    Cancel an invite
 * @access  Private
 */
router.delete("/:id", inviteController.cancelInvite);

/**
 * @route   GET /api/invites/:id/waitlist
 * @desc    Get waitlist for a tee time
 * @access  Private
 */
router.get("/:id/waitlist", inviteController.getWaitlist);

module.exports = router;
