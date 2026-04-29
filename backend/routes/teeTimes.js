const { Router } = require("express");
const { body, query } = require("express-validator");
const teeTimeController = require("../controllers/teeTimeController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/tee-times
 * @desc    Create a new tee time
 * @access  Private
 */
router.post(
  "/",
  [
    body("courseName").trim().notEmpty().withMessage("Course name is required"),
    body("courseLocation").optional().trim(),
    body("teeDate")
      .matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/)
      .withMessage("Valid date required (MM-DD-YYYY)"),
    body("teeTime")
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage("Valid time required (HH:MM)"),
    body("maxPlayers")
      .optional()
      .isInt({ min: 1, max: 8 })
      .withMessage("Max players must be 1-8"),
    body("inviteType")
      .optional()
      .isIn(["roster", "fcfs", "open", "manual"])
      .withMessage("Invalid invite type"),
    body("notes").optional().trim(),
  ],
  validateRequest,
  teeTimeController.createTeeTime,
);

/**
 * @route   GET /api/tee-times
 * @desc    Get user's tee times
 * @access  Private
 */
router.get("/", teeTimeController.getTeeTimes);

/**
 * @route   GET /api/tee-times/upcoming
 * @desc    Get upcoming tee times
 * @access  Private
 */
router.get("/upcoming", teeTimeController.getUpcoming);

/**
 * @route   GET /api/tee-times/open
 * @desc    Get Open invites (community board) filtered by distance
 * @query   lat, lng (required), maxDistance (optional)
 * @access  Private
 */
router.get("/open", teeTimeController.getOpenInvites);

/**
 * @route   POST /api/tee-times/:id/join
 * @desc    Join an Open invite (community board)
 * @access  Private
 */
router.post("/:id/join", teeTimeController.joinOpenInvite);

/**
 * @route   GET /api/tee-times/calendar
 * @desc    Get tee times for calendar view
 * @access  Private
 */
router.get(
  "/calendar",
  [
    query("start")
      .matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/)
      .withMessage("Start date required (MM-DD-YYYY)"),
    query("end")
      .matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/)
      .withMessage("End date required (MM-DD-YYYY)"),
  ],
  validateRequest,
  teeTimeController.getCalendar,
);

/**
 * @route   GET /api/tee-times/history
 * @desc    Get complete tee time history with attendance status
 * @query   filter (all|upcoming|completed|cancelled|no_show), limit, offset
 * @access  Private
 */
router.get("/history", teeTimeController.getHistory);

/**
 * @route   GET /api/tee-times/:id
 * @desc    Get tee time details
 * @access  Private
 */
router.get("/:id", teeTimeController.getTeeTime);

/**
 * @route   POST /api/tee-times/:id/cancel
 * @desc    Cancel a tee time
 * @access  Private
 */
router.post("/:id/cancel", teeTimeController.cancelTeeTime);

/**
 * @route   POST /api/tee-times/:id/invites/:inviteId/skip
 * @desc    Skip an invite and advance to next roster member
 * @access  Private (organizer only)
 */
router.post("/:id/invites/:inviteId/skip", teeTimeController.skipInvite);

/**
 * @route   POST /api/tee-times/:id/on-deck-invites
 * @desc    Send FCFS invites to selected On-Deck players
 * @access  Private (organizer only)
 */
router.post(
  "/:id/on-deck-invites",
  [
    body("playerIds")
      .isArray({ min: 1, max: 50 })
      .withMessage("playerIds must be an array with 1-50 items"),
    body("playerIds.*")
      .isUUID()
      .withMessage("Each playerIds item must be a valid UUID"),
    body("deadline")
      .optional()
      .isISO8601()
      .withMessage("Invalid deadline format"),
  ],
  validateRequest,
  teeTimeController.sendOnDeckInvites,
);

/**
 * @route   POST /api/tee-times/:id/fcfs-deadline
 * @desc    Set FCFS response deadline for all pending invites
 * @access  Private (organizer only)
 */
router.post(
  "/:id/fcfs-deadline",
  [
    body("deadline")
      .isISO8601()
      .withMessage("Valid deadline required (ISO 8601 format)"),
  ],
  validateRequest,
  teeTimeController.setFCFSDeadline,
);

module.exports = router;
