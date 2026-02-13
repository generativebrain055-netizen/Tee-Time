const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");

class NotificationController {
  constructor() {
    this.getNotifications = this.getNotifications.bind(this);
    this.getUnreadCount = this.getUnreadCount.bind(this);
    this.markAsRead = this.markAsRead.bind(this);
    this.markAsUnread = this.markAsUnread.bind(this);
    this.markAsResponded = this.markAsResponded.bind(this);
    this.markAllAsRead = this.markAllAsRead.bind(this);
    this.deleteNotification = this.deleteNotification.bind(this);
  }

  // GET /api/notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0, unreadOnly = false } = req.query;

      let query = supabaseAdmin
        .from("notifications")
        .select("id, type, channel, title, body, data, status, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (unreadOnly === "true") {
        query = query.is("read_at", null);
      }

      const { data, error } = await query;

      if (error) {
        logger.error("Get notifications error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to get notifications" });
      }

      // Filter out notifications that have been responded to (for tee_time_invite types)
      const notifications = (data || [])
        .filter(n => {
          const notifData = n.data || {};
          // Don't show tee_time_invite notifications that have been responded to
          if (notifData.type === "tee_time_invite" && notifData.responded === true) {
            return false;
          }
          return true;
        })
        .map(n => ({
          id: n.id,
          type: n.type,
          channel: n.channel,
          title: n.title,
          body: n.body,
          data: n.data || {},
          isRead: !!n.read_at,
          readAt: n.read_at,
          createdAt: n.created_at,
          status: n.status
        }));

      res.json({ success: true, notifications });
    } catch (error) {
      logger.error("Get notifications error:", error.message);
      res.status(500).json({ success: false, message: "Failed to get notifications" });
    }
  }

  // GET /api/notifications/unread-count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const { count, error } = await supabaseAdmin
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);

      if (error) {
        logger.error("Get unread count error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to get unread count" });
      }

      res.json({ success: true, count: count || 0 });
    } catch (error) {
      logger.error("Get unread count error:", error.message);
      res.status(500).json({ success: false, message: "Failed to get unread count" });
    }
  }

  // PUT /api/notifications/:id/read
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const { data, error } = await supabaseAdmin
        .from("notifications")
        .update({
          read_at: new Date().toISOString(),
          status: "read"
        })
        .eq("id", notificationId)
        .eq("user_id", userId)
        .is("read_at", null)
        .select("id");

      if (error) {
        logger.error("Mark as read error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to mark notification as read" });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: "Notification not found or already read" });
      }

      res.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      logger.error("Mark as read error:", error.message);
      res.status(500).json({ success: false, message: "Failed to mark notification as read" });
    }
  }

  // PUT /api/notifications/:id/unread
  async markAsUnread(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      // First check if notification exists and is read
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("notifications")
        .select("id, read_at")
        .eq("id", notificationId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      if (!existing.read_at) {
        return res.status(400).json({ success: false, message: "Notification is already unread" });
      }

      // Mark as unread
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .update({
          read_at: null,
          status: "sent"
        })
        .eq("id", notificationId)
        .eq("user_id", userId)
        .select("id");

      if (error) {
        logger.error("Mark as unread error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to mark notification as unread" });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      res.json({ success: true, message: "Notification marked as unread" });
    } catch (error) {
      logger.error("Mark as unread error:", error.message);
      res.status(500).json({ success: false, message: "Failed to mark notification as unread" });
    }
  }

  // PUT /api/notifications/:id/responded
  async markAsResponded(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      // Get current notification
      const { data: notification, error: fetchError } = await supabaseAdmin
        .from("notifications")
        .select("data")
        .eq("id", notificationId)
        .eq("user_id", userId)
        .single();

      if (fetchError || !notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      // Update with responded flag
      const updatedData = { ...(notification.data || {}), responded: true };

      const { error } = await supabaseAdmin
        .from("notifications")
        .update({
          data: updatedData,
          read_at: new Date().toISOString(),
          status: "read"
        })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) {
        logger.error("Mark as responded error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to mark notification as responded" });
      }

      res.json({ success: true, message: "Notification marked as responded" });
    } catch (error) {
      logger.error("Mark as responded error:", error.message);
      res.status(500).json({ success: false, message: "Failed to mark notification as responded" });
    }
  }

  // PUT /api/notifications/read-all
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      const { data, error } = await supabaseAdmin
        .from("notifications")
        .update({
          read_at: new Date().toISOString(),
          status: "read"
        })
        .eq("user_id", userId)
        .is("read_at", null)
        .select("id");

      if (error) {
        logger.error("Mark all as read error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to mark notifications as read" });
      }

      res.json({ success: true, count: data?.length || 0, message: "All notifications marked as read" });
    } catch (error) {
      logger.error("Mark all as read error:", error.message);
      res.status(500).json({ success: false, message: "Failed to mark notifications as read" });
    }
  }

  // DELETE /api/notifications/:id
  async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const { data, error } = await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", userId)
        .select("id");

      if (error) {
        logger.error("Delete notification error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to delete notification" });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      res.json({ success: true, message: "Notification deleted" });
    } catch (error) {
      logger.error("Delete notification error:", error.message);
      res.status(500).json({ success: false, message: "Failed to delete notification" });
    }
  }
}

module.exports = new NotificationController();
