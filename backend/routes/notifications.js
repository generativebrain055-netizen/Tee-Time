const { Router } = require("express");
const { query } = require("express-validator");
const notificationController = require("../controllers/notificationController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications with pagination
 * @query   limit (1-100, default 50), offset, unreadOnly
 * @access  Private
 */
router.get(
  "/",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be 1-100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("offset must be >= 0"),
  ],
  validateRequest,
  notificationController.getNotifications,
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get("/unread-count", notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put("/read-all", notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/read
 * @desc    Delete all read notifications for the current user
 * @access  Private
 */
router.delete("/read", notificationController.deleteAllRead);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put("/:id/read", notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/:id/unread
 * @desc    Mark a notification as unread
 * @access  Private
 */
router.put("/:id/unread", notificationController.markAsUnread);

/**
 * @route   PUT /api/notifications/:id/responded
 * @desc    Mark a notification as responded (for actionable notifications like friend requests)
 * @access  Private
 */
router.put("/:id/responded", notificationController.markAsResponded);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
