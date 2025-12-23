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
    body("teeDate").isDate().withMessage("Valid date required (YYYY-MM-DD)"),
    body("teeTime").matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage("Valid time required (HH:MM)"),
    body("maxPlayers").optional().isInt({ min: 1, max: 8 }).withMessage("Max players must be 1-8"),
    body("inviteType").optional().isIn(["roster", "fcfs", "open", "manual"]).withMessage("Invalid invite type"),
    body("notes").optional().trim()
  ],
  validateRequest,
  teeTimeController.createTeeTime
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
 * @route   GET /api/tee-times/calendar
 * @desc    Get tee times for calendar view
 * @access  Private
 */
router.get(
  "/calendar",
  [
    query("start").isDate().withMessage("Start date required"),
    query("end").isDate().withMessage("End date required")
  ],
  validateRequest,
  teeTimeController.getCalendar
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

module.exports = router;
