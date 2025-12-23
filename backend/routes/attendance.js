const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { authenticate } = require("../middleware/auth");

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
 * @route   POST /api/tee-times/:id/check-in/:attendanceId
 * @desc    Mark individual participant status (present or no_show)
 * @access  Private (organizer only)
 * @body    { status: 'present' | 'no_show' }
 */
router.post("/:id/check-in/:attendanceId", attendanceController.updateAttendance);

/**
 * @route   POST /api/tee-times/:id/cancel-participation
 * @desc    User cancels their own participation
 * @access  Private
 */
router.post("/:id/cancel-participation", attendanceController.cancelParticipation);

module.exports = router;
