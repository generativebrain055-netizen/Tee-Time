const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/tee-times/:id/attendance
 * @desc    Get attendance status for all participants
 * @access  Private (organizer only)
 */
router.get("/:id/attendance", attendanceController.getAttendance);

/**
 * @route   POST /api/tee-times/:id/check-in/all
 * @desc    One-tap check-in: Mark all participants as present
 * @access  Private (organizer only)
 */
router.post("/:id/check-in/all", attendanceController.checkInAll);

/**
 * @route   POST /api/tee-times/:id/check-in/batch
 * @desc    Batch update attendance and complete check-in (Figma 437-321: Pre tee time check-in)
 * @access  Private (organizer only)
 * @body    { updates: [{ attendanceId: string, status: 'present' | 'no_show' }] }
 */
router.post(
  "/:id/check-in/batch",
  [
    body("updates")
      .isArray({ min: 1 })
      .withMessage("Updates must be a non-empty array"),
    body("updates.*.attendanceId")
      .notEmpty()
      .withMessage("Each update must have an attendanceId"),
    body("updates.*.status")
      .isIn(["present", "no_show"])
      .withMessage("Each update status must be 'present' or 'no_show'"),
  ],
  validateRequest,
  attendanceController.batchUpdateAttendance
);

/**
 * @route   POST /api/tee-times/:id/check-in/:attendanceId
 * @desc    Mark individual participant status (present or no_show) (Figma 437-321: Pre tee time check-in)
 * @access  Private (organizer only)
 * @body    { status: 'present' | 'no_show' }
 */
router.post(
  "/:id/check-in/:attendanceId",
  [
    body("status")
      .isIn(["present", "no_show"])
      .withMessage("Status must be 'present' or 'no_show'"),
  ],
  validateRequest,
  attendanceController.updateAttendance
);

/**
 * @route   POST /api/tee-times/:id/cancel-participation
 * @desc    User cancels their own participation
 * @access  Private
 */
router.post("/:id/cancel-participation", attendanceController.cancelParticipation);

module.exports = router;
