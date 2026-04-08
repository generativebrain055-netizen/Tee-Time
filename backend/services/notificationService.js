const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");
const { invitesLogger } = require("../config/logger");
const deviceRepository = require("../repositories/deviceRepository");
const userRepository = require("../repositories/userRepository");

/** Resolve profile avatar URL when callers pass a partial user (e.g. only id + names). */
async function resolveUserAvatarUrl(userLike) {
  if (!userLike || typeof userLike !== "object") return null;
  const direct =
    userLike.avatarUrl || userLike.avatar_url || userLike.avatar;
  if (direct) return direct;
  if (!userLike.id) return null;
  try {
    const u = await userRepository.findById(userLike.id);
    if (!u) return null;
    return u.avatar_url || u.avatarUrl || null;
  } catch {
    return null;
  }
}

/** Expo push tokens start with this prefix. Others are treated as FCM tokens. */
const EXPO_PUSH_TOKEN_PREFIX = "ExponentPushToken[";

/** Expo / FCM expect string key–value data payloads. */
function stringifyPushData(data) {
  const out = {};
  if (!data || typeof data !== "object") return out;
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
  }
  return out;
}

/**
 * Notification Service
 * Handles creating in-app notifications and sending push via Expo and/or Firebase FCM.
 * Admin broadcast uses this; FCM is used when devices register FCM tokens.
 */
class NotificationService {
  /**
   * Send push notifications: Expo tokens → Expo Push API; other tokens → Firebase FCM.
   * @param {string[]} pushTokens - Array of Expo or FCM push tokens
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data (flat string values for FCM)
   */
  async sendPushNotifications(pushTokens, title, body, data = {}) {
    if (!pushTokens || pushTokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payload = stringifyPushData(data);

    const expoTokens = pushTokens.filter((t) => t && t.startsWith(EXPO_PUSH_TOKEN_PREFIX));
    const fcmTokens = pushTokens.filter((t) => t && typeof t === "string" && !t.startsWith(EXPO_PUSH_TOKEN_PREFIX));

    let sent = 0;
    let failed = 0;

    if (expoTokens.length > 0) {
      const expoResult = await this._sendExpoPush(expoTokens, title, body, payload);
      sent += expoResult.sent;
      failed += expoResult.failed;
    }

    if (fcmTokens.length > 0) {
      const fcmResult = await this._sendFcmPush(fcmTokens, title, body, payload);
      sent += fcmResult.sent;
      failed += fcmResult.failed;
    }

    return { sent, failed };
  }

  /**
   * Send via Expo Push API (ExponentPushToken[...])
   */
  async _sendExpoPush(pushTokens, title, body, data) {
    try {
      const messages = pushTokens.map((token) => ({
        to: token,
        sound: "default",
        title,
        body,
        data: data || {},
        priority: "high",
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        throw new Error(`Expo push API error: ${response.statusText}`);
      }

      const result = await response.json();
      const results = Array.isArray(result) ? result : result.data || [];
      const sent = results.filter((r) => r.status === "ok").length;
      const failed = results.filter((r) => r.status === "error").length;
      if (failed > 0) {
        logger.warn(`Expo push: ${failed} of ${pushTokens.length} failed`);
      }
      return { sent, failed };
    } catch (error) {
      logger.error("Expo push error:", error.message);
      return { sent: 0, failed: pushTokens.length };
    }
  }

  /**
   * Send via Firebase Cloud Messaging (FCM). Requires Firebase Admin with a service account that has FCM.
   * @param {string[]} tokens - FCM registration tokens
   */
  async _sendFcmPush(tokens, title, body, data) {
    if (!tokens.length) return { sent: 0, failed: 0 };
    try {
      const admin = require("../config/firebaseAdmin");
      if (!admin.messaging) {
        logger.warn("Firebase Admin messaging not available; skipping FCM send.");
        return { sent: 0, failed: tokens.length };
      }
      const dataPayload = {};
      if (data && typeof data === "object") {
        for (const [k, v] of Object.entries(data)) {
          dataPayload[k] = String(v ?? "");
        }
      }
      const message = {
        notification: { title, body },
        data: dataPayload,
        android: {
          priority: "high",
          notification: { sound: "default", channelId: "default" },
        },
        apns: { payload: { aps: { sound: "default" } } },
      };
      const batch = await admin.messaging().sendEachForMulticast({
        tokens,
        ...message,
      });
      const sent = batch.successCount;
      const failed = batch.failureCount;
      if (failed > 0) {
        logger.warn(`FCM push: ${failed} of ${tokens.length} failed`);
      }
      return { sent, failed };
    } catch (error) {
      logger.error("FCM push error:", error.message);
      return { sent: 0, failed: tokens.length };
    }
  }

  /**
   * Check if user has enabled notifications for a specific type
   * @param {string} userId - User ID
   * @param {string} notificationType - Notification type (e.g., 'tee_time_invite', 'friend_request')
   * @param {'push' | 'inApp'} channel - Channel to check
   * @returns {Promise<boolean>} - True if enabled, false otherwise
   */
  async checkNotificationPreference(userId, notificationType, channel) {
    try {
      const { data: profile, error } = await supabaseAdmin
        .from("user_profiles")
        .select("notification_preferences")
        .eq("user_id", userId)
        .single();

      if (error || !profile) {
        // Cannot read preferences — default to enabled (same as historical behavior)
        return true;
      }

      const prefs = profile.notification_preferences || {};

      if (channel === "inApp") {
        if (prefs.types && prefs.types[notificationType]) {
          const typePrefs = prefs.types[notificationType];
          return typePrefs.inApp !== false;
        }
        return true;
      }

      // channel === 'push' — require app toggle, synced OS permission, and per-type when set
      if (prefs.systemPushEnabled === false) return false;
      if (prefs.push === false) return false;

      if (prefs.types && prefs.types[notificationType]) {
        const typePrefs = prefs.types[notificationType];
        if (typePrefs.push === false) return false;
      }

      return true;
    } catch (error) {
      logger.warn(`Error checking notification preferences for user ${userId}:`, error.message);
      return true;
    }
  }

  /**
   * Create a notification (in-app and optionally push)
   * @param {Object} params
   * @param {string} params.userId - User to notify
   * @param {string} params.type - Notification type (in_app, push, etc.)
   * @param {string} params.title - Notification title
   * @param {string} params.body - Notification body
   * @param {Object} params.data - Additional data (type, senderId, etc.)
   * @param {boolean} params.sendPush - Whether to also send push notification (default: false)
   * @param {boolean} params.forceInApp - If true, always persist in-app row (ignores type in-app preference). Use for actionable invites.
   */
  async createNotification({
    userId,
    type = "in_app",
    title,
    body,
    data = {},
    sendPush = false,
    forceInApp = false,
  }) {
    try {
      if (!userId) {
        logger.error("createNotification called without userId");
        invitesLogger.error("[NOTIFICATION] createNotification called without userId", {
          event: "notification_error",
          error: "missing_userId",
        });
        return null;
      }

      const notificationType = data.type || "general";

      // Group invites must always create an in-app row so invitees can Accept/Decline even if they muted the type.
      const inAppEnabled =
        forceInApp ||
        (await this.checkNotificationPreference(userId, notificationType, "inApp"));
      
      invitesLogger.info("[NOTIFICATION] Creating notification", {
        event: "notification_create_start",
        userId,
        notificationType,
        inAppEnabled,
        title,
        dataType: data.type,
      });
      
      let notification = null;
      if (inAppEnabled) {
        // Create in-app notification
        const { data: notif, error } = await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: userId,
            type: type,
            channel: notificationType,
            title: title,
            body: body,
            data: data,
            status: "sent",
          })
          .select()
          .single();

        if (error) {
          logger.error(`Failed to insert notification for user ${userId}, type ${notificationType}:`, error);
          invitesLogger.error("[NOTIFICATION] Database insert failed", {
            event: "notification_db_error",
            userId,
            notificationType,
            error: error?.message,
            code: error?.code,
          });
          throw error;
        }
        notification = notif;
        logger.debug(`Notification created for user ${userId}, type ${notificationType}, id ${notif?.id}`);
        invitesLogger.info("[NOTIFICATION] Notification created successfully", {
          event: "notification_created",
          userId,
          notificationId: notif?.id,
          notificationType,
        });
      } else {
        logger.debug(`Skipping in-app notification for user ${userId}, type ${notificationType} (disabled)`);
        invitesLogger.info("[NOTIFICATION] Notification skipped (disabled)", {
          event: "notification_skipped",
          userId,
          notificationType,
          reason: "user_preference_disabled",
        });
      }

      // Send push notification if requested and enabled
      if (sendPush) {
        const pushEnabled = await this.checkNotificationPreference(userId, notificationType, 'push');
        if (pushEnabled) {
          try {
            const devices = await deviceRepository.findDevicesWithPushTokens(userId);
            const pushTokens = devices.map(d => d.push_token).filter(Boolean);
            
            if (pushTokens.length > 0) {
              await this.sendPushNotifications(pushTokens, title, body, data);
            }
          } catch (pushError) {
            // Log but don't fail - push notifications are optional
            logger.error("Error sending push notification:", pushError.message);
          }
        } else {
          logger.debug(`Skipping push notification for user ${userId}, type ${notificationType} (disabled)`);
        }
      }

      return notification;
    } catch (error) {
      logger.error("Error creating notification:", error.message);
      invitesLogger.error("[NOTIFICATION] Error in createNotification", {
        event: "notification_error",
        userId,
        error: error?.message,
        stack: error?.stack,
        code: error?.code,
      });
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
    const senderAvatar = await resolveUserAvatarUrl(sender);
    return this.createNotification({
      userId: receiverId,
      title: "New Friend Request",
      body: `${senderName} wants to add you as a friend`,
      data: {
        type: "friend_request",
        senderId: sender.id,
        senderName,
        senderAvatar: senderAvatar || null,
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
    const userAvatar = await resolveUserAvatarUrl(accepter);
    return this.createNotification({
      userId: senderId,
      title: "Friend Request Accepted",
      body: `${accepterName} accepted your friend request`,
      data: {
        type: "friend_accepted",
        userId: accepter.id,
        userName: accepterName,
        userAvatar: userAvatar || null,
      },
    });
  }

  /**
   * Create tee time invite notification
   * @param {string} userId - User receiving the notification
   * @param {Object} teeTime - Tee time info
   * @param {Object} inviter - Inviter info
   * @param {string|null} expiresAt - Expiry date/time
   * @param {string|null} inviteId - The invite ID (required for responding)
   */
  async notifyTeeTimeInvite(userId, teeTime, inviter, expiresAt = null, inviteId = null) {
    const inviterName =
      `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() ||
      "Someone";
    // Handle both camelCase and snake_case field names
    const date = teeTime.date || teeTime.tee_date;
    const time = teeTime.time || teeTime.tee_time;
    const courseName = teeTime.courseName || teeTime.course_name;
    const dateStr = this.formatDateForNotification(date);

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

    const inviterAvatar = await resolveUserAvatarUrl(inviter);

    return this.createNotification({
      userId,
      title: "Tee Time Invitation",
      body,
      data: {
        type: "tee_time_invite",
        inviteId: inviteId || null, // Include inviteId so frontend can respond
        teeTimeId: teeTime.id,
        inviterId: inviter.id,
        inviterName,
        inviterAvatar,
        courseName: courseName || null,
        date: date || null,
        time: time || null,
        maxPlayers: teeTime.maxPlayers || teeTime.max_players || null,
        expiresAt: expiresAt || null,
      },
      sendPush: true, // So invitees get a push and don't miss the invite
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
      sendPush: true,
    });
  }

  /**
   * Notify a user they have been invited to a roster group (Figma 1269-977).
   * Invitee sees "Group request" card with Accept/Decline.
   */
  async notifyGroupInvite(inviteeUserId, inviter, groupId, groupName, groupMeta = {}) {
    if (!inviter?.id) {
      logger.error("notifyGroupInvite: inviter missing id", { inviteeUserId, groupId });
      return null;
    }
    const inviterName =
      `${inviter.firstName || inviter.first_name || ""} ${inviter.lastName || inviter.last_name || ""}`.trim() ||
      "Someone";
    let inviterAvatar =
      inviter.avatarUrl ||
      inviter.avatar_url ||
      inviter.avatar ||
      null;
    if (!inviterAvatar) {
      inviterAvatar = await resolveUserAvatarUrl(inviter);
    }
    return this.createNotification({
      userId: inviteeUserId,
      title: "Group invitation",
      body: `${inviterName} invited you to join the group "${groupName || "Group"}"`,
      data: {
        type: "group_invite",
        groupId,
        groupName: groupName || null,
        inviterId: inviter.id,
        inviterName,
        inviterAvatar,
        groupColor: groupMeta.color != null ? groupMeta.color : null,
        groupIcon: groupMeta.icon != null ? groupMeta.icon : null,
        memberCount: groupMeta.memberCount ?? null,
      },
      sendPush: true,
      forceInApp: true,
    });
  }

  /**
   * Notify the group inviter that their invitation was accepted (activity notification).
   */
  async notifyGroupInviteAccepted(inviterUserId, inviteeName) {
    const body = `Your group invitation to ${inviteeName || "this user"} has been accepted`;
    return this.createNotification({
      userId: inviterUserId,
      title: "Group invitation accepted",
      body,
      data: {
        type: "group_invite_accepted",
        inviteeName: inviteeName || null,
      },
      sendPush: true,
    });
  }

  /**
   * Notify a group member that the roster group was updated (name, details, etc.).
   */
  async notifyGroupUpdated(memberUserId, owner, groupId, groupName) {
    const ownerName =
      `${owner.firstName || owner.first_name || ""} ${
        owner.lastName || owner.last_name || ""
      }`.trim() || "Someone";
    return this.createNotification({
      userId: memberUserId,
      title: "Group updated",
      body: `${ownerName} updated the roster group "${groupName || "Group"}"`,
      data: {
        type: "group_updated",
        groupId,
        groupName: groupName || null,
        ownerId: owner.id,
        ownerName,
      },
      sendPush: true,
    });
  }

  /**
   * Notify a group member that the roster group was deleted.
   */
  async notifyGroupDeleted(memberUserId, owner, groupName) {
    const ownerName =
      `${owner.firstName || owner.first_name || ""} ${
        owner.lastName || owner.last_name || ""
      }`.trim() || "Someone";
    return this.createNotification({
      userId: memberUserId,
      title: "Group deleted",
      body: `${ownerName} deleted the roster group "${groupName || "Group"}"`,
      data: {
        type: "group_deleted",
        groupName: groupName || null,
        ownerId: owner.id,
        ownerName,
      },
      sendPush: true,
    });
  }

  /**
   * Notify a user they were removed from someone else's roster.
   * Intentionally disabled — roster changes do not notify the contact.
   */
  async notifyRemovedFromRoster(_memberUserId, _owner) {
    return null;
  }

  /**
   * Notify a roster contact that their On-Deck status changed.
   * Intentionally disabled — on-deck changes do not notify the contact.
   */
  async notifyOnDeckAvailability(_memberUserId, _owner, _isOnDeck, _rosterId) {
    return null;
  }

  /**
   * Roster add notification (legacy API).
   * Intentionally disabled — roster add does not notify the contact.
   */
  async notifyAddedToRoster(_userId, _adder) {
    return null;
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
      sendPush: true,
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
      sendPush: true,
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
    const organizerAvatar = await resolveUserAvatarUrl(organizer);
    return this.createNotification({
      userId,
      title: "Spot Opened Up!",
      body: `A spot has opened in ${organizerName}'s Tee Time on ${dateStr} at ${teeTime.course_name}. First to respond is in!`,
      data: {
        type: "spot_opened",
        teeTimeId: teeTime.id,
        organizerId: organizer.id,
        organizerName,
        organizerAvatar,
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
      sendPush: true,
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
      sendPush: true,
    });
  }

  /**
   * Not enough players in the invite pipeline to fill open spots — prompt organizer to invite more.
   */
  async notifyOrganizerInviteMorePlayers(
    organizerId,
    teeTime,
    spotsRemaining,
    pipelineCount
  ) {
    const teeDateStr = teeTime.tee_date
      ? this.formatDateForNotification(teeTime.tee_date)
      : "";
    const teeTimeStr =
      teeTime.tee_time != null ? String(teeTime.tee_time).slice(0, 5) : "";
    const spotWord = spotsRemaining === 1 ? "spot" : "spots";
    const pipeWord = pipelineCount === 1 ? "invite" : "invites";
    return this.createNotification({
      userId: organizerId,
      title: "Invite more players",
      body: `Your tee time at ${teeTime.course_name} still has ${spotsRemaining} open ${spotWord}, but only ${pipelineCount} active ${pipeWord} can fill them. Add players from your roster or On-Deck.`,
      data: {
        type: "organizer_invite_more",
        teeTimeId: teeTime.id,
        courseName: teeTime.course_name,
        teeDate: teeDateStr,
        teeTime: teeTimeStr,
        spotsRemaining,
        pipelineCount,
        action: "INVITE_MORE",
        unfilledSlotAlert: true,
      },
      sendPush: true,
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

  /**
   * Notify user when someone in their roster posts on Waiver Wire
   * Sends both in-app and push notifications
   */
  async notifyWaiverWirePost(userId, poster, waiverWireEntry) {
    const posterName = `${poster.firstName || ""} ${poster.lastName || ""}`.trim() || "Someone";
    const dateStr = new Date(waiverWireEntry.availableDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    
    // Format time slot label properly
    const timeSlotLabels = {
      'morning': 'Morning',
      'midday': 'Mid-Day',
      'afternoon': 'Afternoon',
      'anytime': 'Anytime'
    };
    const timeSlotLabel = waiverWireEntry.preferredTime 
      ? timeSlotLabels[waiverWireEntry.preferredTime] || waiverWireEntry.preferredTime
      : '';
    
    const body = timeSlotLabel 
      ? `${posterName} posted availability for ${dateStr} (${timeSlotLabel})`
      : `${posterName} posted availability for ${dateStr}`;
    
    return this.createNotification({
      userId,
      title: "New Waiver Wire Post",
      body: body,
      data: {
        type: "waiver_wire",
        posterId: poster.id,
        posterName,
        waiverWireId: waiverWireEntry.id,
        availableDate: waiverWireEntry.availableDate,
        preferredTime: waiverWireEntry.preferredTime,
      },
      sendPush: true, // Enable push notifications for Waiver Wire posts
    });
  }

  /**
   * Mark in-app friend_request rows as responded for the receiver (matches data.requestId).
   * Called after accept/decline so the notification list stays correct on refresh and other devices.
   */
  async markFriendRequestNotificationsResponded(receiverUserId, friendRequestId) {
    if (!receiverUserId || !friendRequestId) return { updated: 0 };
    try {
      const { data: notifications, error: notifError } = await supabaseAdmin
        .from("notifications")
        .select("id, data")
        .eq("user_id", receiverUserId);

      if (notifError || !notifications?.length) {
        return { updated: 0 };
      }

      const matching = notifications.filter((notif) => {
        const d = notif.data || {};
        return (
          d.type === "friend_request" &&
          d.requestId === friendRequestId &&
          d.responded !== true
        );
      });

      for (const notif of matching) {
        const updatedData = { ...(notif.data || {}), responded: true };
        await supabaseAdmin
          .from("notifications")
          .update({
            data: updatedData,
            read_at: new Date().toISOString(),
            status: "read",
          })
          .eq("id", notif.id)
          .eq("user_id", receiverUserId);
      }

      return { updated: matching.length };
    } catch (error) {
      logger.warn("markFriendRequestNotificationsResponded:", error?.message);
      return { updated: 0 };
    }
  }
}

module.exports = new NotificationService();
