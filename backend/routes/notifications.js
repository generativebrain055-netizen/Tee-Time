const { Router } = require("express");
const notificationController = require("../controllers/notificationController");
const { authenticate } = require("../middleware/auth");

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @query   limit, offset, unreadOnly
 * @access  Private
 */
router.get("/", notificationController.getNotifications);

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
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put("/:id/read", notificationController.markAsRead);

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
