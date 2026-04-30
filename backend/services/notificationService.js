const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");
const { invitesLogger } = require("../config/logger");
const deviceRepository = require("../repositories/deviceRepository");
const userRepository = require("../repositories/userRepository");
const conversationRepository = require("../repositories/conversationRepository");
const friendRepository = require("../repositories/friendRepository");

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

/**
 * Map backend `data.type` to the key used in app `notification_preferences.types`
 * (see NotificationSettingsScreen NOTIFICATION_TYPES). Unlisted types use themselves or default on.
 */
const NOTIFICATION_PREFERENCE_TYPE_ALIASES = {
  invite_warning: "tee_time_invite",
  invite_expired: "tee_time_invite",
  fcfs_deadline: "tee_time_invite",
  fcfs_deadline_set: "tee_time_invite",
  invite_completed: "tee_time_booked",
  tee_time_details_updated: "tee_time_booked",
  organizer_fill_warning: "tee_time_response",
  tee_time_not_filled: "tee_time_response",
  organizer_invite_more: "tee_time_response",
  roster_exhausted: "tee_time_response",
  tee_time_at_risk: "tee_time_response",
  no_show: "check_in_reminder",
  broadcast: "message",
  general: "message",
};

function getEffectiveNotificationPreferenceType(notificationType) {
  if (!notificationType || typeof notificationType !== "string") {
    return "message";
  }
  return (
    NOTIFICATION_PREFERENCE_TYPE_ALIASES[notificationType] || notificationType
  );
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
      const effectiveType =
        getEffectiveNotificationPreferenceType(notificationType);

      if (channel === "inApp") {
        if (prefs.types && prefs.types[effectiveType]) {
          const typePrefs = prefs.types[effectiveType];
          return typePrefs.inApp !== false;
        }
        return true;
      }

      // channel === 'push' — require app toggle, synced OS permission, and per-type when set
      if (prefs.systemPushEnabled === false) return false;
      if (prefs.push === false) return false;

      if (prefs.types && prefs.types[effectiveType]) {
        const typePrefs = prefs.types[effectiveType];
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

      // In-app and push each respect user preferences (and optional type aliases → settings keys).
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
              const pushData =
                notification?.id != null
                  ? { ...data, notificationId: notification.id }
                  : { ...data };
              await this.sendPushNotifications(pushTokens, title, body, pushData);
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
      sendPush: true,
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
      sendPush: true,
    });
  }

  /**
   * Build title/body/data for a tee time invite (new or refreshed row).
   * @param {Object} teeTime - Must include id, tee_date/tee_time (or date/time), course_name/courseName
   * @param {Object} inviter - { id, firstName, lastName, ... }
   * @param {string|null} expiresAt - Invite response deadline ISO
   * @param {string|null} inviteId - Invite row id
   */
  async buildTeeTimeInvitePayload(teeTime, inviter, expiresAt, inviteId) {
    const inviterName =
      `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() ||
      "Someone";
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
    if (courseName && String(courseName).trim()) {
      body += `\n${String(courseName).trim()}`;
    }

    const inviterAvatar = await resolveUserAvatarUrl(inviter);

    return {
      title: "Tee Time Invitation",
      body,
      data: {
        type: "tee_time_invite",
        inviteId: inviteId || null,
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
    };
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
    const { title, body, data } = await this.buildTeeTimeInvitePayload(
      teeTime,
      inviter,
      expiresAt,
      inviteId,
    );
    return this.createNotification({
      userId,
      title,
      body,
      data,
      sendPush: true,
    });
  }

  /**
   * When the organizer changes date/time/course, rewrite existing in-app
   * `tee_time_invite` rows for pending invitees so copy and `data` match the tee time.
   * Does not insert new rows or send push (invitees already get `tee_time_details_updated`).
   */
  async refreshPendingInviteNotificationsAfterTeeTimeDetailsUpdate({
    teeTimeId,
    updatedTeeTime,
    organizer,
  }) {
    const inviteRepository = require("../repositories/inviteRepository");
    if (!teeTimeId || !updatedTeeTime) return;

    let invites;
    try {
      invites = await inviteRepository.getInvitesByTeeTime(teeTimeId);
    } catch (e) {
      logger.warn(
        "refreshPendingInviteNotificationsAfterTeeTimeDetailsUpdate: getInvitesByTeeTime",
        e?.message,
      );
      return;
    }
    if (!invites?.length) return;

    const teeTimeForPayload = {
      id: teeTimeId,
      tee_date: updatedTeeTime.tee_date,
      tee_time: updatedTeeTime.tee_time,
      course_name: updatedTeeTime.course_name,
      courseName: updatedTeeTime.course_name,
      max_players: updatedTeeTime.max_players,
      maxPlayers: updatedTeeTime.max_players,
    };

    const inviter =
      organizer && organizer.id
        ? organizer
        : {
            id: updatedTeeTime.creator_id,
            firstName: updatedTeeTime.first_name,
            lastName: updatedTeeTime.last_name,
          };

    for (const inv of invites) {
      if (String(inv.status || "").toLowerCase() !== "pending") continue;
      const inviteeId = inv.invitee_user_id;
      if (!inviteeId || !inv.id) continue;

      const { title, body, data } = await this.buildTeeTimeInvitePayload(
        teeTimeForPayload,
        inviter,
        inv.expires_at || null,
        inv.id,
      );

      const { data: rows, error } = await supabaseAdmin
        .from("notifications")
        .select("id, data")
        .eq("user_id", inviteeId)
        .filter("data->>type", "eq", "tee_time_invite")
        .filter("data->>inviteId", "eq", String(inv.id));

      if (error) {
        logger.warn(
          `refreshPendingInviteNotifications invite ${inv.id}:`,
          error.message,
        );
        continue;
      }

      for (const row of rows || []) {
        const prev = row.data || {};
        if (prev.responded === true) continue;

        const mergedData = {
          ...data,
          ...(prev.declined === true ? { declined: true } : {}),
        };

        const { error: upErr } = await supabaseAdmin
          .from("notifications")
          .update({
            title,
            body,
            data: mergedData,
          })
          .eq("id", row.id)
          .eq("user_id", inviteeId);

        if (upErr) {
          logger.warn(
            `refreshPendingInviteNotifications row ${row.id}:`,
            upErr.message,
          );
        }
      }
    }
  }

  /**
   * Create tee time invite response notification
   */
  async notifyTeeTimeResponse(ownerId, responder, teeTime, accepted, inviteId = null) {
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
        inviteId: inviteId || null,
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
    const course =
      teeTime.courseName || teeTime.course_name || "the course";
    return this.createNotification({
      userId: organizerId,
      type: "push",
      title: "Is Everyone Here?",
      body: `Your tee time at ${course} starts in 5 minutes. Tap to confirm attendance.`,
      data: {
        type: "check_in_reminder",
        teeTimeId: teeTime.id,
        courseName: course,
        action: "OPEN_CHECK_IN",
      },
      sendPush: true,
    });
  }

  /**
   * Create no-show notification for user
   */
  async notifyNoShow(userId, teeTime) {
    const course =
      teeTime.courseName || teeTime.course_name || "the course";
    return this.createNotification({
      userId,
      title: "Attendance Update",
      body: `You were marked as a no-show for ${course}. Your Social Rate has been updated.`,
      data: {
        type: "no_show",
        teeTimeId: teeTime.id,
        action: "VIEW_SOCIAL_RATE",
      },
      sendPush: true,
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
      title: "Tee Time at Risk",
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
      sendPush: true,
    });
  }

  /**
   * Tee time just became fully booked (confirmed): notify every participant to open the tee-time group chat.
   * Copy uses MM/DD/YYYY at course; tap opens the pre-created conversation.
   */
  async notifyPlayersTeeTimeBooked(teeTimeId, conversationId) {
    if (!teeTimeId || !conversationId) return;
    try {
      const { data: tt, error: ttErr } = await supabaseAdmin
        .from("tee_times")
        .select("course_name, tee_date")
        .eq("id", teeTimeId)
        .single();
      if (ttErr || !tt) {
        logger.warn("notifyPlayersTeeTimeBooked: tee time not found", teeTimeId, ttErr?.message);
        return;
      }
      const courseName = String(tt.course_name || "the course").trim() || "the course";
      const dateStr = this.formatDateForNotification(tt.tee_date);
      const datePart = dateStr || "your scheduled date";

      const userIds = await conversationRepository.getTeeTimeChatEligibleUserIds(teeTimeId);
      if (!userIds.length) {
        logger.warn("notifyPlayersTeeTimeBooked: no eligible recipients", teeTimeId);
        return;
      }
      const title = "Tee time booked";
      const body = `Congratulations, your tee time is booked for ${datePart} at ${courseName}. Tap to message your group.`;
      const data = {
        type: "tee_time_booked",
        teeTimeId,
        conversationId,
        courseName,
        teeDate: tt.tee_date,
      };

      for (const userId of userIds) {
        await this.createNotification({
          userId,
          title,
          body,
          data,
          sendPush: true,
        });
      }
    } catch (e) {
      logger.error("notifyPlayersTeeTimeBooked error:", e?.message);
    }
  }

  /**
   * When a user sends a chat message, notify other active participants (push + in-app per preferences).
   * Skips muted threads and blocked relationships (direct / tee_time / group).
   */
  async notifyNewChatMessage({ conversationId, senderId, previewText, messageId }) {
    if (!conversationId || !senderId) return;
    try {
      const { data: parts, error: partsErr } = await supabaseAdmin
        .from("conversation_participants")
        .select("user_id, is_muted")
        .eq("conversation_id", conversationId)
        .is("left_at", null);

      if (partsErr || !parts?.length) return;

      const { data: senderUser } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name")
        .eq("id", senderId)
        .maybeSingle();
      const senderName =
        [senderUser?.first_name, senderUser?.last_name].filter(Boolean).join(" ").trim() ||
        "Someone";

      const rawPreview = typeof previewText === "string" ? previewText.trim() : "";
      const body =
        rawPreview.length > 0
          ? rawPreview.length > 160
            ? `${rawPreview.slice(0, 159)}…`
            : rawPreview
          : "Sent a message";

      for (const p of parts) {
        const uid = p.user_id;
        if (!uid || uid === senderId) continue;
        if (p.is_muted) continue;

        const blocked = await friendRepository.isBlocked(senderId, uid);
        if (blocked) continue;

        await this.createNotification({
          userId: uid,
          title: senderName,
          body,
          data: {
            type: "message",
            conversationId,
            senderId,
            senderName,
            ...(messageId ? { messageId } : {}),
          },
          sendPush: true,
        });
      }
    } catch (e) {
      logger.warn("notifyNewChatMessage:", e?.message);
    }
  }

  /**
   * Notify user that FCFS deadline is approaching
   */
  async notifyFCFSDeadlineApproaching(userId, teeTime, hoursRemaining) {
    const course =
      teeTime.course_name || teeTime.courseName || "the course";
    const ttId = teeTime.id || teeTime.tee_time_id;
    return this.createNotification({
      userId,
      title: "Response Deadline Approaching",
      body: `Only ${hoursRemaining} hour${
        hoursRemaining > 1 ? "s" : ""
      } left to respond to the tee time at ${course}!`,
      data: {
        type: "fcfs_deadline",
        teeTimeId: ttId,
        courseName: course,
        hoursRemaining,
        action: "RESPOND_NOW",
      },
      sendPush: true,
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
      title: "Tee Time at Risk",
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
      title: "Tee Time at Risk",
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
      title: "Tee Time at Risk",
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
   * Helper to format date for notifications as MM/DD/YYYY
   * Plain YYYY-MM-DD strings: calendar date (no UTC midnight shift)
   * Date from PostgreSQL DATE: UTC y/m/d → local calendar
   */
  formatDateForNotification(date) {
    if (!date) return "";

    let d;
    if (typeof date === "string") {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const day = Number(m[3]);
        d = new Date(y, mo - 1, day);
      } else {
        d = new Date(date);
      }
    } else {
      d = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      );
    }

    if (Number.isNaN(d.getTime())) return "";

    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  /**
   * Notify user when someone in their roster posts on Waiver Wire
   * Sends both in-app and push notifications
   */
  async notifyWaiverWirePost(userId, poster, waiverWireEntry) {
    const posterName = `${poster.firstName || ""} ${poster.lastName || ""}`.trim() || "Someone";
    const dateStr = this.formatDateForNotification(waiverWireEntry.availableDate);
    
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
   * Invitee successfully confirmed (not waitlisted) — push + in-app so they know the invite is complete.
   */
  async notifyInviteCompleted(inviteeUserId, teeTime, organizer, inviteId = null) {
    if (!inviteeUserId || !teeTime?.id) return null;
    const course = teeTime.course_name || teeTime.courseName || "the course";
    const dateStr = this.formatDateForNotification(
      teeTime.tee_date || teeTime.date,
    );
    const orgName =
      `${organizer?.firstName || organizer?.first_name || ""} ${
        organizer?.lastName || organizer?.last_name || ""
      }`.trim() || "The organizer";
    const datePart = dateStr ? ` on ${dateStr}` : "";
    return this.createNotification({
      userId: inviteeUserId,
      title: "You're in!",
      body: `Your invite is complete — you're confirmed for ${course}${datePart}.`,
      data: {
        type: "invite_completed",
        teeTimeId: teeTime.id,
        inviteId: inviteId || null,
        courseName: teeTime.course_name || teeTime.courseName || null,
        organizerId: organizer?.id || null,
        organizerName: orgName,
      },
      sendPush: true,
    });
  }

  /**
   * Participants (except organizer) when date/time/course/location changed.
   */
  async notifyTeeTimeDetailsUpdated({
    teeTimeId,
    organizerName,
    recipientUserIds,
    updatedTeeTime,
    changes,
  }) {
    if (!teeTimeId || !updatedTeeTime) return;
    const course =
      updatedTeeTime.course_name || updatedTeeTime.courseName || "your tee time";
    const bits = [];
    if (changes?.teeDate) bits.push("date");
    if (changes?.teeTime) bits.push("time");
    if (changes?.courseName || changes?.courseLocation) {
      bits.push("course or location");
    }
    const detailStr =
      bits.length > 0 ? bits.join(", ") : "details";
    const title = "Tee time updated";
    const body = `${organizerName || "The organizer"} updated the ${detailStr} for ${course}.`;
    const data = {
      type: "tee_time_details_updated",
      teeTimeId,
      courseName: course,
    };
    const ids = Array.isArray(recipientUserIds) ? recipientUserIds : [];
    for (const uid of ids) {
      if (!uid) continue;
      try {
        await this.createNotification({
          userId: uid,
          title,
          body,
          data: { ...data },
          sendPush: true,
        });
      } catch (e) {
        logger.warn("notifyTeeTimeDetailsUpdated:", e?.message);
      }
    }
  }

  /**
   * Remove in-app rows tied to a tee-time invite (data.inviteId), e.g. pending invite and 5m warning.
   * Call when the invite expires so actionable cards do not linger.
   */
  async removeInAppNotificationsForInvite(inviteeUserId, inviteId) {
    if (!inviteeUserId || !inviteId) return;
    try {
      const { error } = await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", inviteeUserId)
        .filter("data->>inviteId", "eq", String(inviteId));

      if (error) {
        logger.warn(
          `removeInAppNotificationsForInvite(${inviteId}):`,
          error.message,
        );
      }
    } catch (err) {
      logger.warn("removeInAppNotificationsForInvite:", err?.message);
    }
  }

  /**
   * Batch: clear stale invite notifications for each expired invite row.
   */
  async removeInAppNotificationsForExpiredInvites(invites) {
    if (!invites?.length) return;
    for (const inv of invites) {
      if (inv.invitee_user_id) {
        await this.removeInAppNotificationsForInvite(inv.invitee_user_id, inv.id);
      }
    }
  }

  /**
   * Mark in-app friend_request rows as responded for the receiver (matches data.requestId).
   * Called after accept/decline so the notification list stays correct on refresh and other devices.
   */
  async markFriendRequestNotificationsResponded(receiverUserId, friendRequestId, response) {
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

      const declined = response === "declined";

      for (const notif of matching) {
        const updatedData = {
          ...(notif.data || {}),
          responded: true,
          declined,
        };
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
