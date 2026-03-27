/**
 * Invite creation handlers
 */
const inviteRepository = require("../../../repositories/inviteRepository");
const teeTimeRepository = require("../../../repositories/teeTimeRepository");
const rosterRepository = require("../../../repositories/rosterRepository");
const userRepository = require("../../../repositories/userRepository");
const notificationService = require("../../../services/notificationService");
const logger = require("../../../config/logger");
const { invitesLogger } = require("../../../config/logger");
const { sendInviteSms } = require("../smsService");
const { INVITE_TYPES } = require("../constants");

const fcfsDeadlineService = require("../../../services/fcfsDeadlineService");

/** Try to find app user by phone (E.164 or digits). Returns user id or null. */
async function findUserIdByPhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  const trimmed = phone.trim();
  let user = await userRepository.findByPhoneNumber(trimmed);
  if (user) return user.id;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10) {
    const withPlus = digits.length === 10 ? `+1${digits}` : `+${digits}`;
    if (withPlus !== trimmed) user = await userRepository.findByPhoneNumber(withPlus);
    if (user) return user.id;
    if (digits.length === 10) user = await userRepository.findByPhoneNumber(digits);
    if (user) return user.id;
  }
  return null;
}

/**
 * If invite has phone but no user id, resolve user by phone; update invite and send in-app notification if found.
 * @returns {Promise<boolean>} true if in-app notification was sent (caller can skip SMS)
 */
async function notifyPhoneInviteeIfAppUser(invite, teeTime, inviter, expiresAt) {
  if (invite.invitee_user_id || !invite.invitee_phone) return false;
  const inviteeUserId = await findUserIdByPhone(invite.invitee_phone);
  if (!inviteeUserId) return false;
  try {
    await inviteRepository.updateInviteeUserId(invite.id, inviteeUserId);
    invitesLogger.info("[INVITE] Resolved phone to app user, sending in-app notification", {
      event: "invite_phone_resolved",
      inviteId: invite.id,
      inviteeUserId,
    });
    await notificationService.notifyTeeTimeInvite(
      inviteeUserId,
      {
        id: teeTime.id,
        date: teeTime.tee_date,
        time: teeTime.tee_time,
        courseName: teeTime.course_name,
        maxPlayers: teeTime.max_players,
      },
      inviter,
      expiresAt,
      invite.id
    );
    return true;
  } catch (err) {
    invitesLogger.error("[INVITE] Failed to notify phone-resolved user", {
      event: "invite_phone_resolve_error",
      inviteId: invite.id,
      error: err?.message,
    });
    logger.error(`Error notifying resolved user for invite ${invite.id}:`, err);
    return false;
  }
}

/**
 * Create FCFS invites - all at once, first to accept get spots
 * Can optionally include a deadline from the request
 */
const createFCFSInvites = async (req, res, teeTime, invitees) => {
  try {
    const userId = req.user.id;
    const { deadline } = req.body; // Get deadline from request if provided

    invitesLogger.info("[INVITE] FCFS invite creation started", {
      event: "invite_create_start",
      teeTimeId: teeTime.id,
      inviterId: userId,
      inviteeCount: invitees?.length || 0,
      invitees: invitees?.map(inv => ({
        hasUserId: !!inv.userId,
        userId: inv.userId,
        hasPhone: !!inv.phone,
        phone: inv.phone,
        name: inv.name,
      })),
    });

    // If deadline is provided, use createBulkInvitesWithExpiry
    let createdInvites;
    let expiresAt = null;
    if (deadline) {
      const deadlineDate = new Date(deadline);
      // Validate date is valid and in the future
      if (!isNaN(deadlineDate.getTime()) && deadlineDate > new Date()) {
        expiresAt = deadlineDate;
      } else {
        logger.warn(`Invalid deadline provided: ${deadline}, ignoring`);
      }
    }

    if (expiresAt) {
      // Create invites with expiry
      createdInvites = await inviteRepository.createBulkInvitesWithExpiry(
        teeTime.id,
        userId,
        invitees.map((inv, idx) => ({ ...inv, position: idx, expiresAt }))
      );
    } else {
      // Create invites without expiry (original behavior)
      createdInvites = await inviteRepository.createBulkInvites(
        teeTime.id,
        userId,
        invitees.map((inv, idx) => ({ ...inv, position: idx }))
      );
    }

    invitesLogger.info("[INVITE] FCFS invites created in database", {
      event: "invites_created",
      teeTimeId: teeTime.id,
      inviteCount: createdInvites?.length || 0,
      invites: createdInvites?.map(inv => ({
        inviteId: inv.id,
        inviteeUserId: inv.invitee_user_id,
        inviteePhone: inv.invitee_phone,
        inviteeName: inv.invitee_name,
        status: inv.status,
      })),
    });

    // Notify scheduler new invites exist
    fcfsDeadlineService.triggerUpdate();

    // Send notifications to all invitees simultaneously
    for (const invite of createdInvites) {
      if (invite.invitee_user_id) {
        // In-app notification for registered users - include deadline if set
        try {
          invitesLogger.info("[INVITE] Sending notification to registered user", {
            event: "notification_send_start",
            inviteId: invite.id,
            inviteeUserId: invite.invitee_user_id,
            teeTimeId: teeTime.id,
          });

          const notification = await notificationService.notifyTeeTimeInvite(
            invite.invitee_user_id,
            {
              id: teeTime.id,
              date: teeTime.tee_date,
              time: teeTime.tee_time,
              courseName: teeTime.course_name,
              maxPlayers: teeTime.max_players,
            },
            {
              id: userId,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            expiresAt, // Pass deadline to notification
            invite.id // Pass inviteId so frontend can respond
          );
          
          if (notification) {
            invitesLogger.info("[INVITE] Notification sent successfully", {
              event: "notification_sent",
              inviteId: invite.id,
              inviteeUserId: invite.invitee_user_id,
              notificationId: notification.id,
            });
          } else {
            invitesLogger.warn("[INVITE] Notification creation returned null", {
              event: "notification_failed",
              inviteId: invite.id,
              inviteeUserId: invite.invitee_user_id,
            });
            logger.warn(`Failed to create notification for invite ${invite.id}, user ${invite.invitee_user_id}`);
          }
        } catch (notifError) {
          invitesLogger.error("[INVITE] Notification send error", {
            event: "notification_error",
            inviteId: invite.id,
            inviteeUserId: invite.invitee_user_id,
            error: notifError?.message,
            stack: notifError?.stack,
          });
          logger.error(`Error sending notification for invite ${invite.id}:`, notifError);
        }
      } else if (invite.invitee_phone) {
        const sentInApp = await notifyPhoneInviteeIfAppUser(
          invite,
          teeTime,
          { id: userId, firstName: req.user.firstName, lastName: req.user.lastName },
          expiresAt
        );
        if (!sentInApp) {
          invitesLogger.info("[INVITE] Sending SMS to phone invitee", {
            event: "sms_send_start",
            inviteId: invite.id,
            inviteePhone: invite.invitee_phone,
          });
          await sendInviteSms(invite, teeTime, true, null, expiresAt);
        }
      } else {
        invitesLogger.warn("[INVITE] Invite has no userId or phone", {
          event: "invite_no_contact",
          inviteId: invite.id,
          inviteeName: invite.invitee_name,
        });
      }
    }

    logger.info(
      `FCFS invites created for tee time ${teeTime.id}: ${
        createdInvites.length
      } invites${expiresAt ? `, deadline: ${expiresAt.toISOString()}` : ""}`
    );

    res.status(201).json({
      success: true,
      invites: createdInvites,
      deadline: expiresAt,
      message: `${createdInvites.length} invites sent. First ${
        teeTime.max_players - 1
      } to accept will get spots!${
        expiresAt ? ` Deadline: ${expiresAt.toLocaleString()}` : ""
      }`,
    });
  } catch (error) {
    logger.error("Create FCFS invites error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create FCFS invites" });
  }
};

/**
 * Create Roster invites - Initial invites sent immediately, backup invites activated on decline
 * Initial invites: First (maxPlayers - 1) invites get sent immediately
 * Backup invites: Remaining invites are created but not activated until someone declines
 */
const createRosterInvites = async (
  req,
  res,
  teeTime,
  invitees,
  responseWindow = 2
) => {
  try {
    const userId = req.user.id;
    const responseWindowMs = (responseWindow || 2) * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + responseWindowMs);
    
    invitesLogger.info("[INVITE] Roster invite creation started", {
      event: "invite_create_start",
      teeTimeId: teeTime.id,
      inviterId: userId,
      inviteeCount: invitees?.length || 0,
      responseWindow,
      maxPlayers: teeTime.max_players,
      invitees: invitees?.map(inv => ({
        hasUserId: !!inv.userId,
        userId: inv.userId,
        hasPhone: !!inv.phone,
        phone: inv.phone,
        name: inv.name,
        order: inv.order,
      })),
    });
    
    // Calculate how many initial invites to send (maxPlayers - 1, since creator is already counted)
    const initialInviteCount = Math.max(0, teeTime.max_players - 1);
    
    // Prepare all invitees with positions
    const inviteesWithPosition = invitees.map((inv, idx) => ({
      ...inv,
      position: inv.order != null ? inv.order : idx,
    }));

    // Split into initial and backup invites
    const initialInvitees = inviteesWithPosition.slice(0, initialInviteCount);
    const backupInvitees = inviteesWithPosition.slice(initialInviteCount);

    invitesLogger.info("[INVITE] Split invitees into initial and backup", {
      event: "invitees_split",
      initialCount: initialInvitees.length,
      backupCount: backupInvitees.length,
      initialInvitees: initialInvitees.map(inv => ({
        userId: inv.userId,
        phone: inv.phone,
        name: inv.name,
      })),
    });

    // Create initial invites with expiry (these will be sent immediately)
    const initialInvitesData = initialInvitees.map((inv) => ({
      ...inv,
      expiresAt: expiresAt,
    }));

    // Create backup invites without expiry (these will be activated later)
    const backupInvitesData = backupInvitees.map((inv) => ({
      ...inv,
      expiresAt: null, // No expiry until activated
    }));

    // Create all invites in the database
    const allInvitesData = [...initialInvitesData, ...backupInvitesData];
    const createdInvites = await inviteRepository.createBulkInvitesWithExpiry(
      teeTime.id,
      userId,
      allInvitesData
    );

    invitesLogger.info("[INVITE] Roster invites created in database", {
      event: "invites_created",
      teeTimeId: teeTime.id,
      totalInvites: createdInvites?.length || 0,
      invites: createdInvites?.map(inv => ({
        inviteId: inv.id,
        inviteeUserId: inv.invitee_user_id,
        inviteePhone: inv.invitee_phone,
        inviteeName: inv.invitee_name,
        status: inv.status,
        expiresAt: inv.expires_at,
      })),
    });

    // Initial vs backup for *notifications* must match DB rows: first N invites by roster order,
    // same as initialInviteesData / backupInviteesData. Do not use pos>0 (that drops 0-based positions).
    const sortedCreated = [...createdInvites].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    const initialInvites = sortedCreated.slice(0, initialInviteCount);
    const backupInvites = sortedCreated.slice(initialInviteCount);
    
    invitesLogger.info("[INVITE] Separated invites into initial and backup", {
      event: "invites_separated",
      totalInvites: createdInvites.length,
      initialInviteCount,
      initialInvitesCount: initialInvites.length,
      backupInvitesCount: backupInvites.length,
      initialInvitePositions: initialInvites.map(inv => inv.position),
      backupInvitePositions: backupInvites.map(inv => inv.position),
      allInvitePositions: createdInvites.map(inv => ({ id: inv.id, position: inv.position })),
    });

    // Notify scheduler new invites exist
    fcfsDeadlineService.triggerUpdate();

    // Send notifications ONLY to initial invitees (not backup)
    invitesLogger.info("[INVITE] Starting notification send for initial invites", {
      event: "notification_batch_start",
      initialInviteCount: initialInvites.length,
    });

    for (const invite of initialInvites) {
      if (invite.invitee_user_id) {
        // In-app notification for registered users - include deadline
        try {
          invitesLogger.info("[INVITE] Sending notification to registered user", {
            event: "notification_send_start",
            inviteId: invite.id,
            inviteeUserId: invite.invitee_user_id,
            teeTimeId: teeTime.id,
            expiresAt: invite.expires_at,
          });

          const notification = await notificationService.notifyTeeTimeInvite(
            invite.invitee_user_id,
            {
              id: teeTime.id,
              date: teeTime.tee_date,
              time: teeTime.tee_time,
              courseName: teeTime.course_name,
              maxPlayers: teeTime.max_players,
            },
            {
              id: userId,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            invite.expires_at, // Pass the deadline
            invite.id // Pass inviteId so frontend can respond
          );
          
          if (notification) {
            invitesLogger.info("[INVITE] Notification sent successfully", {
              event: "notification_sent",
              inviteId: invite.id,
              inviteeUserId: invite.invitee_user_id,
              notificationId: notification.id,
            });
          } else {
            invitesLogger.warn("[INVITE] Notification creation returned null", {
              event: "notification_failed",
              inviteId: invite.id,
              inviteeUserId: invite.invitee_user_id,
            });
            logger.warn(`Failed to create notification for invite ${invite.id}, user ${invite.invitee_user_id}`);
          }
        } catch (notifError) {
          invitesLogger.error("[INVITE] Notification send error", {
            event: "notification_error",
            inviteId: invite.id,
            inviteeUserId: invite.invitee_user_id,
            error: notifError?.message,
            stack: notifError?.stack,
          });
          logger.error(`Error sending notification for invite ${invite.id}:`, notifError);
        }
      } else if (invite.invitee_phone) {
        const sentInApp = await notifyPhoneInviteeIfAppUser(
          invite,
          teeTime,
          { id: userId, firstName: req.user.firstName, lastName: req.user.lastName },
          invite.expires_at
        );
        if (!sentInApp) {
          invitesLogger.info("[INVITE] Sending SMS to phone invitee", {
            event: "sms_send_start",
            inviteId: invite.id,
            inviteePhone: invite.invitee_phone,
          });
          await sendInviteSms(invite, teeTime, false, responseWindow);
        }
      } else {
        invitesLogger.warn("[INVITE] Invite has no userId or phone", {
          event: "invite_no_contact",
          inviteId: invite.id,
          inviteeName: invite.invitee_name,
        });
      }
    }

    logger.info(
      `Roster invites created for tee time ${teeTime.id}: ${initialInvites.length} initial invites sent, ${backupInvites.length} backup invites created (will be activated on decline)`
    );

    res.status(201).json({
      success: true,
      invites: createdInvites,
      initialInvites: initialInvites.length,
      backupInvites: backupInvites.length,
      responseWindow,
      message: `${initialInvites.length} initial invites sent. ${backupInvites.length > 0 ? `${backupInvites.length} backup invites ready.` : ''}`,
    });
  } catch (error) {
    logger.error("Create roster invites error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create roster invites" });
  }
};

/**
 * Create invites from roster entries
 */
const createFromRoster = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teeTimeId, rosterIds, count } = req.body;

    const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
    if (!teeTime || teeTime.creator_id !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const roster = await rosterRepository.getRoster(userId);
    let toInvite = [];

    if (rosterIds && rosterIds.length > 0) {
      toInvite = roster.filter((r) => rosterIds.includes(r.id));
    } else if (count) {
      toInvite = roster.slice(0, count);
    }

    const invitees = toInvite.map((r) => ({
      userId: r.contact_user_id,
      phone: r.contact_phone,
      name:
        r.contact_name || `${r.first_name || ""} ${r.last_name || ""}`.trim(),
    }));

    const createdInvites = await inviteRepository.createBulkInvites(
      teeTimeId,
      userId,
      invitees
    );

    invitesLogger.info("[INVITE] From-roster invites created", {
      event: "invites_created",
      teeTimeId: teeTime.id,
      inviteCount: createdInvites?.length || 0,
      invites: createdInvites?.map(inv => ({
        inviteId: inv.id,
        inviteeUserId: inv.invitee_user_id,
        inviteePhone: inv.invitee_phone,
        inviteeName: inv.invitee_name,
      })),
    });

    for (const invite of createdInvites) {
      if (invite.invitee_user_id) {
        // In-app notification for registered users
        try {
          invitesLogger.info("[INVITE] Sending notification to registered user", {
            event: "notification_send_start",
            inviteId: invite.id,
            inviteeUserId: invite.invitee_user_id,
            teeTimeId: teeTime.id,
          });

          const notification = await notificationService.notifyTeeTimeInvite(
            invite.invitee_user_id,
            {
              id: teeTime.id,
              date: teeTime.tee_date,
              time: teeTime.tee_time,
              courseName: teeTime.course_name,
            },
            {
              id: userId,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            null, // expiresAt
            invite.id // Pass inviteId so frontend can respond
          );
          
          if (notification) {
            invitesLogger.info("[INVITE] Notification sent successfully", {
              event: "notification_sent",
              inviteId: invite.id,
              inviteeUserId: invite.invitee_user_id,
              notificationId: notification.id,
            });
          } else {
            invitesLogger.warn("[INVITE] Notification creation returned null", {
              event: "notification_failed",
              inviteId: invite.id,
              inviteeUserId: invite.invitee_user_id,
            });
            logger.warn(`Failed to create notification for invite ${invite.id}, user ${invite.invitee_user_id}`);
          }
        } catch (notifError) {
          invitesLogger.error("[INVITE] Notification send error", {
            event: "notification_error",
            inviteId: invite.id,
            inviteeUserId: invite.invitee_user_id,
            error: notifError?.message,
            stack: notifError?.stack,
          });
          logger.error(`Error sending notification for invite ${invite.id}:`, notifError);
        }
      } else if (invite.invitee_phone) {
        const sentInApp = await notifyPhoneInviteeIfAppUser(
          invite,
          teeTime,
          { id: userId, firstName: req.user.firstName, lastName: req.user.lastName },
          null
        );
        if (!sentInApp) {
          invitesLogger.info("[INVITE] Sending SMS to phone invitee", {
            event: "sms_send_start",
            inviteId: invite.id,
            inviteePhone: invite.invitee_phone,
          });
          await sendInviteSms(invite, teeTime);
        }
      } else {
        invitesLogger.warn("[INVITE] Invite has no userId or phone", {
          event: "invite_no_contact",
          inviteId: invite.id,
          inviteeName: invite.invitee_name,
        });
      }
    }

    res.status(201).json({
      success: true,
      invites: createdInvites,
      count: createdInvites.length,
    });
  } catch (error) {
    logger.error("Create from roster error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create invites from roster",
    });
  }
};

module.exports = {
  createFCFSInvites,
  createRosterInvites,
  createFromRoster,
  notifyPhoneInviteeIfAppUser,
};
