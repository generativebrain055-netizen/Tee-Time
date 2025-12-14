const { Router } = require("express");
const { body } = require("express-validator");
const inviteController = require("../controllers/inviteController");
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
    body("invitees").isArray({ min: 1 }).withMessage("At least one invitee required"),
    body("invitees.*.userId").optional().isUUID().withMessage("Invalid user ID"),
    body("invitees.*.phone").optional().matches(/^\+?[1-9]\d{6,14}$/).withMessage("Invalid phone"),
    body("invitees.*.name").optional().trim()
  ],
  validateRequest,
  inviteController.createInvites
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
    body("rosterIds").optional().isArray().withMessage("rosterIds must be an array"),
    body("count").optional().isInt({ min: 1, max: 20 }).withMessage("Count must be 1-20")
  ],
  validateRequest,
  inviteController.createFromRoster
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
 */
router.put(
  "/:id/respond",
  [
    body("response").isIn(["accepted", "declined", "maybe"]).withMessage("Response must be accepted, declined, or maybe"),
    body("message").optional().trim().isLength({ max: 500 }).withMessage("Message too long")
  ],
  validateRequest,
  inviteController.respondToInvite
);

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
