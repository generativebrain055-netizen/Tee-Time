const { supabaseAdmin } = require("../config/supabase");
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
  async createNotification({
    userId,
    type = "in_app",
    title,
    body,
    data = {},
  }) {
    try {
      const { data: notification, error } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: userId,
          type: type,
          channel: data.type || "general",
          title: title,
          body: body,
          data: data,
          status: "sent",
        })
        .select()
        .single();

      if (error) throw error;
      return notification;
    } catch (error) {
      logger.error("Error creating notification:", error.message);
      // Don't throw - notifications shouldn't break main flow
      return null;
    }
  }

  /**
   * Create friend request notification
   * @param {string} receiverId - User receiving the notification
   * @param {Object} sender - Sender info (id, firstName, lastName, avatar)
   * @param {string} requestId - The friend request ID for responding
   */
  async notifyFriendRequest(receiverId, sender, requestId) {
    const senderName =
      `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || "Someone";
    return this.createNotification({
      userId: receiverId,
      title: "New Friend Request",
      body: `${senderName} wants to add you as a friend`,
      data: {
        type: "friend_request",
        senderId: sender.id,
        senderName,
        senderAvatar: sender.avatar || null,
        requestId: requestId,
      },
    });
  }

  /**
   * Create friend request accepted notification
   */
  async notifyFriendRequestAccepted(senderId, accepter) {
    const accepterName =
      `${accepter.firstName || ""} ${accepter.lastName || ""}`.trim() ||
      "Someone";
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
  async notifyTeeTimeInvite(userId, teeTime, inviter, expiresAt = null) {
    const inviterName =
      `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() ||
      "Someone";
    const dateStr = this.formatDateForNotification(teeTime.date);

    let body = `${inviterName} invited you to play on ${dateStr}`;
    if (expiresAt) {
      const deadline = new Date(expiresAt);
      const deadlineStr = deadline.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      body += `. Respond by ${deadlineStr}`;
    }

    return this.createNotification({
      userId,
      title: "Tee Time Invitation",
      body,
      data: {
        type: "tee_time_invite",
        teeTimeId: teeTime.id,
        inviterId: inviter.id,
        inviterName,
        courseName: teeTime.courseName || null,
        date: teeTime.date,
        time: teeTime.time,
        expiresAt: expiresAt || null,
      },
    });
  }

  /**
   * Create tee time invite response notification
   */
  async notifyTeeTimeResponse(ownerId, responder, teeTime, accepted) {
    const responderName =
      `${responder.firstName || ""} ${responder.lastName || ""}`.trim() ||
      "Someone";
    return this.createNotification({
      userId: ownerId,
      title: accepted ? "Invite Accepted" : "Invite Declined",
      body: `${responderName} ${
        accepted ? "accepted" : "declined"
      } your tee time invitation`,
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
    const adderName =
      `${adder.firstName || ""} ${adder.lastName || ""}`.trim() || "Someone";
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

  /**
   * Create check-in reminder notification for organizer
   * Sent 5 minutes before tee time
   */
  async notifyCheckInReminder(organizerId, teeTime) {
    return this.createNotification({
      userId: organizerId,
      type: "push",
      title: "Is Everyone Here?",
      body: `Your tee time at ${teeTime.courseName} starts in 5 minutes. Tap to confirm attendance.`,
      data: {
        type: "check_in_reminder",
        teeTimeId: teeTime.id,
        courseName: teeTime.courseName,
        action: "OPEN_CHECK_IN",
      },
    });
  }

  /**
   * Create no-show notification for user
   */
  async notifyNoShow(userId, teeTime) {
    return this.createNotification({
      userId,
      title: "Attendance Update",
      body: `You were marked as a no-show for ${teeTime.courseName}. Your Social Rate has been updated.`,
      data: {
        type: "no_show",
        teeTimeId: teeTime.id,
        action: "VIEW_SOCIAL_RATE",
      },
    });
  }

  /**
   * Notify organizer that roster is exhausted and prompt to use On-Deck players
   */
  async notifyRosterExhausted(organizerId, teeTime, spotsRemaining) {
    const courseName =
      teeTime.course_name || teeTime.courseName || "the course";
    return this.createNotification({
      userId: organizerId,
      title: "Roster Exhausted",
      body: `Your tee time at ${courseName} has ${spotsRemaining} spot${
        spotsRemaining > 1 ? "s" : ""
      } remaining. Select from On-Deck players to fill.`,
      data: {
        type: "roster_exhausted",
        teeTimeId: teeTime.id,
        courseName,
        spotsRemaining,
        action: "SELECT_ON_DECK",
      },
    });
  }

  /**
   * Notify organizer that a confirmed player has cancelled
   */
  async notifyPlayerCancelled(organizerId, teeTime, cancelledPlayer) {
    const playerName =
      `${cancelledPlayer.firstName || ""} ${
        cancelledPlayer.lastName || ""
      }`.trim() || "A player";
    const courseName =
      teeTime.course_name || teeTime.courseName || "the course";
    return this.createNotification({
      userId: organizerId,
      title: "Player Cancelled",
      body: `${playerName} has cancelled their spot for ${courseName}. A replacement invite is being sent.`,
      data: {
        type: "player_cancelled",
        teeTimeId: teeTime.id,
        cancelledPlayerId: cancelledPlayer.id,
        cancelledPlayerName: playerName,
        courseName,
      },
    });
  }

  /**
   * Notify FCFS waitlist that a spot has opened up
   */
  async notifySpotOpened(userId, teeTime, organizer) {
    const organizerName =
      `${organizer.firstName || ""} ${organizer.lastName || ""}`.trim() ||
      "Someone";
    const dateStr = this.formatDateForNotification(teeTime.tee_date);
    return this.createNotification({
      userId,
      title: "Spot Opened Up!",
      body: `A spot has opened in ${organizerName}'s Tee Time on ${dateStr} at ${teeTime.course_name}. First to respond is in!`,
      data: {
        type: "spot_opened",
        teeTimeId: teeTime.id,
        organizerId: organizer.id,
        organizerName,
        courseName: teeTime.course_name,
        date: teeTime.tee_date,
        time: teeTime.tee_time,
        action: "RESPOND_NOW",
      },
    });
  }

  /**
   * Notify user that FCFS deadline is approaching
   */
  async notifyFCFSDeadlineApproaching(userId, teeTime, hoursRemaining) {
    return this.createNotification({
      userId,
      title: "Response Deadline Approaching",
      body: `Only ${hoursRemaining} hour${
        hoursRemaining > 1 ? "s" : ""
      } left to respond to the tee time at ${teeTime.course_name}!`,
      data: {
        type: "fcfs_deadline",
        teeTimeId: teeTime.id,
        courseName: teeTime.course_name,
        hoursRemaining,
        action: "RESPOND_NOW",
      },
    });
  }

  /**
   * Notify organizer that tee time is not filled by deadline
   */

  /**
   * Unfilled Slot Alert: notify organizer that tee time deadline is approaching with unfilled spots
   * This is sent BEFORE the deadline expires to give them time to act (Figma 791-484, 791-628, etc.)
   */
  async notifyOrganizerFillWarning(organizerId, teeTime, spotsRemaining) {
    const teeDateStr = teeTime.tee_date ? this.formatDateForNotification(teeTime.tee_date) : "";
    const teeTimeStr = teeTime.tee_time != null ? String(teeTime.tee_time).slice(0, 5) : "";
    return this.createNotification({
      userId: organizerId,
      title: "Unfilled Slot Alert",
      body: `Your tee time at ${
        teeTime.course_name
      } still has ${spotsRemaining} open spot${
        spotsRemaining > 1 ? "s" : ""
      }. Response deadline expires soon - invite from On-Deck now!`,
      data: {
        type: "organizer_fill_warning",
        teeTimeId: teeTime.id,
        courseName: teeTime.course_name,
        teeDate: teeDateStr,
        teeTime: teeTimeStr,
        spotsRemaining,
        action: "SELECT_ON_DECK",
        urgent: true,
        unfilledSlotAlert: true,
      },
    });
  }

  /**
   * Unfilled Slot Alert: notify organizer that tee time was not filled by deadline (Figma 791-*)
   */
  async notifyTeeTimeNotFilled(organizerId, teeTime, spotsRemaining) {
    const teeDateStr = teeTime.tee_date ? this.formatDateForNotification(teeTime.tee_date) : "";
    const teeTimeStr = teeTime.tee_time != null ? String(teeTime.tee_time).slice(0, 5) : "";
    return this.createNotification({
      userId: organizerId,
      title: "Unfilled Slot Alert",
      body: `Your tee time at ${
        teeTime.course_name
      } still has ${spotsRemaining} open spot${
        spotsRemaining > 1 ? "s" : ""
      }. Would you like to invite On-Deck players?`,
      data: {
        type: "tee_time_not_filled",
        teeTimeId: teeTime.id,
        courseName: teeTime.course_name,
        teeDate: teeDateStr,
        teeTime: teeTimeStr,
        spotsRemaining,
        action: "SELECT_ON_DECK",
        unfilledSlotAlert: true,
      },
    });
  }

  /**
   * Helper to format date for notifications
   * Uses UTC methods to avoid timezone shift with PostgreSQL DATE type
   */
  formatDateForNotification(date) {
    if (!date) return "";

    let d;
    if (typeof date === "string") {
      // Parse string date as local time
      const [year, month, day] = date.split("-").map(Number);
      d = new Date(year, month - 1, day);
    } else {
      // Date object from PostgreSQL - use UTC values to avoid shift
      d = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      );
    }

    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
}

module.exports = new NotificationService();
