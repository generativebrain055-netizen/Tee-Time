/**
 * Invite creation handlers
 */
const inviteRepository = require("../../../repositories/inviteRepository");
const teeTimeRepository = require("../../../repositories/teeTimeRepository");
const rosterRepository = require("../../../repositories/rosterRepository");
const notificationService = require("../../../services/notificationService");
const logger = require("../../../config/logger");
const { sendInviteSms } = require("../smsService");
const { INVITE_TYPES } = require("../constants");

const fcfsDeadlineService = require("../../../services/fcfsDeadlineService");

/**
 * Create FCFS invites - all at once, first to accept get spots
 * Can optionally include a deadline from the request
 */
const createFCFSInvites = async (req, res, teeTime, invitees) => {
  try {
    const userId = req.user.id;
    const { deadline } = req.body; // Get deadline from request if provided

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

    // Notify scheduler new invites exist
    fcfsDeadlineService.triggerUpdate();

    // Send notifications to all invitees simultaneously
    for (const invite of createdInvites) {
      if (invite.invitee_user_id) {
        // In-app notification for registered users - include deadline if set
        await notificationService.notifyTeeTimeInvite(
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
          expiresAt // Pass deadline to notification
        );
      } else if (invite.invitee_phone) {
        await sendInviteSms(invite, teeTime, true, null, expiresAt);
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

    // Separate created invites into initial and backup based on position
    const initialInvites = createdInvites
      .filter((inv) => inv.position < initialInviteCount)
      .sort((a, b) => a.position - b.position);
    const backupInvites = createdInvites
      .filter((inv) => inv.position >= initialInviteCount)
      .sort((a, b) => a.position - b.position);

    // Notify scheduler new invites exist
    fcfsDeadlineService.triggerUpdate();

    // Send notifications ONLY to initial invitees (not backup)
    for (const invite of initialInvites) {
      if (invite.invitee_user_id) {
        // In-app notification for registered users - include deadline
        await notificationService.notifyTeeTimeInvite(
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
          invite.expires_at // Pass the deadline
        );
      } else if (invite.invitee_phone) {
        await sendInviteSms(invite, teeTime, false, responseWindow);
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

    for (const invite of createdInvites) {
      if (invite.invitee_user_id) {
        // In-app notification for registered users
        await notificationService.notifyTeeTimeInvite(
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
          }
        );
      } else if (invite.invitee_phone) {
        await sendInviteSms(invite, teeTime);
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
};
