const { pool } = require("../config/database");
const logger = require("../config/logger");

class NotificationController {
  constructor() {
    this.getNotifications = this.getNotifications.bind(this);
    this.getUnreadCount = this.getUnreadCount.bind(this);
    this.markAsRead = this.markAsRead.bind(this);
    this.markAllAsRead = this.markAllAsRead.bind(this);
    this.deleteNotification = this.deleteNotification.bind(this);
  }

  // GET /api/notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0, unreadOnly = false } = req.query;

      let whereClause = "n.user_id = $1";
      if (unreadOnly === "true") {
        whereClause += " AND n.read_at IS NULL";
      }

      const query = `
        SELECT n.id, n.type, n.channel, n.title, n.body, n.data,
               n.status, n.read_at, n.created_at
        FROM notifications n
        WHERE ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [userId, parseInt(limit), parseInt(offset)]);

      const notifications = result.rows.map(n => ({
        id: n.id,
        type: n.type,
        channel: n.channel,
        title: n.title,
        body: n.body,
        data: n.data || {},
        isRead: !!n.read_at,
        readAt: n.read_at,
        createdAt: n.created_at
      }));

      res.json({ success: true, notifications });
    } catch (error) {
      logger.error("Get notifications error:", error);
      res.status(500).json({ success: false, message: "Failed to get notifications" });
    }
  }

  // GET /api/notifications/unread-count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = $1 AND read_at IS NULL`,
        [userId]
      );

      res.json({ success: true, count: parseInt(result.rows[0].count) });
    } catch (error) {
      logger.error("Get unread count error:", error);
      res.status(500).json({ success: false, message: "Failed to get unread count" });
    }
  }

  // PUT /api/notifications/:id/read
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const result = await pool.query(
        `UPDATE notifications SET read_at = NOW(), status = 'read'
         WHERE id = $1 AND user_id = $2 AND read_at IS NULL
         RETURNING id`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Notification not found or already read" });
      }

      res.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      logger.error("Mark as read error:", error);
      res.status(500).json({ success: false, message: "Failed to mark notification as read" });
    }
  }

  // PUT /api/notifications/read-all
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        `UPDATE notifications SET read_at = NOW(), status = 'read'
         WHERE user_id = $1 AND read_at IS NULL
         RETURNING id`,
        [userId]
      );

      res.json({ success: true, count: result.rows.length, message: "All notifications marked as read" });
    } catch (error) {
      logger.error("Mark all as read error:", error);
      res.status(500).json({ success: false, message: "Failed to mark notifications as read" });
    }
  }

  // DELETE /api/notifications/:id
  async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const result = await pool.query(
        `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      res.json({ success: true, message: "Notification deleted" });
    } catch (error) {
      logger.error("Delete notification error:", error);
      res.status(500).json({ success: false, message: "Failed to delete notification" });
    }
  }
}

module.exports = new NotificationController();
