const { pool } = require("../config/database");
const logger = require("../config/logger");

/**
 * Notification Service
 * Handles creating in-app notifications for various events
 */
class NotificationService {
  /**
   * Create a notification
   * @param {Object} params
   * @param {string} params.userId - User to notify
   * @param {string} params.type - Notification type (in_app, push, etc.)
   * @param {string} params.title - Notification title
   * @param {string} params.body - Notification body
   * @param {Object} params.data - Additional data (type, senderId, etc.)
   */
  async createNotification({ userId, type = "in_app", title, body, data = {} }) {
    try {
      const query = `
        INSERT INTO notifications (user_id, type, channel, title, body, data, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'sent')
        RETURNING id
      `;
      const result = await pool.query(query, [
        userId,
        type,
        data.type || "general",
        title,
        body,
        JSON.stringify(data),
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating notification:", error);
      // Don't throw - notifications shouldn't break main flow
      return null;
    }
  }

  /**
   * Create friend request notification
   */
  async notifyFriendRequest(receiverId, sender) {
    const senderName = `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || "Someone";
    return this.createNotification({
      userId: receiverId,
      title: "New Friend Request",
      body: `${senderName} wants to be your friend`,
      data: {
        type: "friend_request",
        senderId: sender.id,
        senderName,
        senderAvatar: sender.avatar || null,
      },
    });
  }

  /**
   * Create friend request accepted notification
   */
  async notifyFriendRequestAccepted(senderId, accepter) {
    const accepterName = `${accepter.firstName || ""} ${accepter.lastName || ""}`.trim() || "Someone";
    return this.createNotification({
      userId: senderId,
      title: "Friend Request Accepted",
      body: `${accepterName} accepted your friend request`,
      data: {
        type: "friend_accepted",
        userId: accepter.id,
        userName: accepterName,
        userAvatar: accepter.avatar || null,
      },
    });
  }

  /**
   * Create tee time invite notification
   */
  async notifyTeeTimeInvite(userId, teeTime, inviter) {
    const inviterName = `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() || "Someone";
    const dateStr = new Date(teeTime.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return this.createNotification({
      userId,
      title: "Tee Time Invitation",
      body: `${inviterName} invited you to play on ${dateStr}`,
      data: {
        type: "tee_time_invite",
        teeTimeId: teeTime.id,
        inviterId: inviter.id,
        inviterName,
        courseName: teeTime.courseName || null,
        date: teeTime.date,
        time: teeTime.time,
      },
    });
  }

  /**
   * Create tee time invite response notification
   */
  async notifyTeeTimeResponse(ownerId, responder, teeTime, accepted) {
    const responderName = `${responder.firstName || ""} ${responder.lastName || ""}`.trim() || "Someone";
    return this.createNotification({
      userId: ownerId,
      title: accepted ? "Invite Accepted" : "Invite Declined",
      body: `${responderName} ${accepted ? "accepted" : "declined"} your tee time invitation`,
      data: {
        type: "tee_time_response",
        teeTimeId: teeTime.id,
        responderId: responder.id,
        responderName,
        accepted,
      },
    });
  }

  /**
   * Create roster add notification
   */
  async notifyAddedToRoster(userId, adder) {
    const adderName = `${adder.firstName || ""} ${adder.lastName || ""}`.trim() || "Someone";
    return this.createNotification({
      userId,
      title: "Added to Roster",
      body: `${adderName} added you to their roster`,
      data: {
        type: "roster_add",
        ownerId: adder.id,
        ownerName: adderName,
      },
    });
  }
}

module.exports = new NotificationService();
