/**
 * Tee Time Service
 * Business logic for tee time operations
 * @module services/teeTimeService
 */

const teeTimeRepository = require("../repositories/teeTimeRepository");
const inviteRepository = require("../repositories/inviteRepository");
const inviteManagementService = require("./inviteManagementService");
const notificationService = require("./notificationService");
const logger = require("../config/logger");
const { parseApiDateToISO } = require("../utils/dateUtils");

/**
 * Custom error for tee time business logic violations
 */
class TeeTimeServiceError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "TeeTimeServiceError";
  }
}

/**
 * Create a new tee time
 * @throws {TeeTimeServiceError} If tee time is in the past
 */
async function createTeeTime(userId, data) {
  const {
    courseName,
    courseLocation,
    teeDate,
    teeTime,
    maxPlayers,
    inviteType,
    notes,
  } = data;
  const normalizedTeeDate = parseApiDateToISO(teeDate);
  if (!normalizedTeeDate) {
    throw new TeeTimeServiceError("Invalid tee date format", "INVALID_DATE");
  }

  // Business rule: Cannot create tee time in the past
  const now = new Date();
  const teeDateTime = new Date(`${normalizedTeeDate}T${teeTime}`);

  if (teeDateTime < now) {
    throw new TeeTimeServiceError(
      "Cannot create a tee time in the past",
      "PAST_DATE",
    );
  }

  return teeTimeRepository.createTeeTime(userId, {
    courseName,
    courseLocation,
    teeDate: normalizedTeeDate,
    teeTime,
    maxPlayers,
    inviteType,
    notes,
  });
}

/**
 * Get user's tee times with optional status filter
 */
async function getTeeTimes(userId, status) {
  // Side effect: Mark past tee times as completed
  await teeTimeRepository.markPastTeeTimesCompleted();

  return teeTimeRepository.getUserTeeTimes(userId, status);
}

/**
 * Get upcoming tee times with participants (optimized - no N+1)
 */
async function getUpcomingTeeTimes(userId, limit = 10) {
  // Side effect: Mark past tee times as completed
  await teeTimeRepository.markPastTeeTimesCompleted();

  const teeTimes = await teeTimeRepository.getUpcomingTeeTimes(userId, limit);

  if (teeTimes.length === 0) {
    return [];
  }

  // Batch fetch all participants in a single query (N+1 fix)
  const teeTimeIds = teeTimes.map((t) => t.id);
  const participantsByTeeTime =
    await teeTimeRepository.getParticipantsBatch(teeTimeIds);

  // Map tee times with their participants
  return teeTimes.map((t) => ({
    teeTime: t,
    participants: participantsByTeeTime[t.id] || [],
  }));
}

/**
 * Get a single tee time with participants and invites
 * @throws {TeeTimeServiceError} If tee time not found
 */
async function getTeeTimeById(teeTimeId) {
  const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
  if (!teeTime) {
    throw new TeeTimeServiceError("Tee time not found", "NOT_FOUND", 404);
  }

  const [participants, invites, cancelledParticipants] = await Promise.all([
    teeTimeRepository.getParticipants(teeTimeId),
    inviteRepository.getInvitesByTeeTime(teeTimeId),
    teeTimeRepository.getCancelledParticipants(teeTimeId),
  ]);

  return { teeTime, participants, invites, cancelledParticipants };
}

/**
 * Cancel a tee time
 * @throws {TeeTimeServiceError} If not found or not authorized
 */
async function cancelTeeTime(teeTimeId, userId) {
  const cancelled = await teeTimeRepository.cancelTeeTime(teeTimeId, userId);
  if (!cancelled) {
    throw new TeeTimeServiceError(
      "Tee time not found or not authorized",
      "NOT_FOUND_OR_UNAUTHORIZED",
      404,
    );
  }
  return cancelled;
}

/**
 * Get calendar data for a date range
 * @throws {TeeTimeServiceError} If dates are missing
 */
async function getCalendar(userId, startDate, endDate) {
  const normalizedStartDate = parseApiDateToISO(startDate);
  const normalizedEndDate = parseApiDateToISO(endDate);
  if (!normalizedStartDate || !normalizedEndDate) {
    throw new TeeTimeServiceError(
      "start and end dates required",
      "MISSING_DATES",
    );
  }

  // Side effect: Mark past tee times as completed
  const updated = await teeTimeRepository.markPastTeeTimesCompleted();
  if (updated.length > 0) {
    logger.info(`Auto-completed ${updated.length} past tee times`);
  }

  const teeTimes = await teeTimeRepository.getTeeTimesByDateRange(
    userId,
    normalizedStartDate,
    normalizedEndDate,
  );

  if (!teeTimes || teeTimes.length === 0) {
    return {};
  }

  // Batch fetch participants for month view (Figma 565-* full schedule)
  const teeTimeIds = teeTimes.map((t) => t.id);
  const participantsByTeeTime = (await teeTimeRepository.getParticipantsBatch(teeTimeIds)) || {};

  const { formatCalendarEntry, formatParticipant } = require("../formatters/teeTimeFormatter");

  const calendar = {};
  teeTimes.forEach((t) => {
    const entry = formatCalendarEntry(t);
    const rawParticipants = participantsByTeeTime[entry.id] || [];
    entry.participants = rawParticipants.map((p) =>
      formatParticipant({
        ...p,
        is_creator: p.user_id === entry.creatorId,
        handicap: p.user_handicap ?? p.handicap,
      }),
    );
    const dateKey = entry.date;
    if (!calendar[dateKey]) {
      calendar[dateKey] = [];
    }
    calendar[dateKey].push(entry);
  });

  return calendar;
}

/**
 * Get tee time history for a user
 */
async function getHistory(userId, options = {}) {
  const { filter = "all", limit = 20, offset = 0 } = options;

  return teeTimeRepository.getTeeTimeHistory(userId, {
    filter,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}

/**
 * Skip an invite and advance to next roster member
 * @throws {TeeTimeServiceError} If not authorized or invalid state
 */
async function skipInvite(teeTimeId, inviteId, userId) {
  // Verify user is the creator
  const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
  if (!teeTime) {
    throw new TeeTimeServiceError("Tee time not found", "NOT_FOUND", 404);
  }
  if (teeTime.creator_id !== userId) {
    throw new TeeTimeServiceError(
      "Only the organizer can skip invites",
      "UNAUTHORIZED",
      403,
    );
  }

  // Get and validate the invite
  const invite = await inviteRepository.getInviteById(inviteId);
  if (!invite || invite.tee_time_id !== teeTimeId) {
    throw new TeeTimeServiceError("Invite not found", "INVITE_NOT_FOUND", 404);
  }
  if (invite.status !== "pending") {
    throw new TeeTimeServiceError(
      "Can only skip pending invites",
      "INVALID_STATUS",
    );
  }

  // Mark as skipped (using 'expired' status)
  await inviteRepository.respondToInvite(
    inviteId,
    invite.invitee_user_id,
    "expired",
  );

  // Get and activate next invite
  const nextInvite = await inviteRepository.getNextPendingInvite(teeTimeId);
  let activatedInvite = null;

  if (nextInvite) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    activatedInvite = await inviteRepository.activateInvite(
      nextInvite.id,
      expiresAt,
    );

    // Notify the next candidate immediately after activation.
    if (nextInvite.invitee_user_id) {
      await notificationService.notifyTeeTimeInvite(
        nextInvite.invitee_user_id,
        {
          id: teeTime.id,
          date: teeTime.tee_date,
          time: teeTime.tee_time,
          courseName: teeTime.course_name,
          maxPlayers: teeTime.max_players,
        },
        {
          id: teeTime.creator_id,
          firstName: teeTime.first_name || "",
          lastName: teeTime.last_name || "",
        },
        expiresAt,
        nextInvite.id,
      );
    }
  }

  // Get updated invites list
  const allInvites = await inviteRepository.getInvitesByTeeTime(teeTimeId);

  return { inviteId, nextInvite, activatedInvite, allInvites };
}

/**
 * Send on-deck (FCFS) invites to selected players
 */
async function sendOnDeckInvites(teeTimeId, userId, playerIds, deadline) {
  const deadlineDate = deadline ? new Date(deadline) : null;

  return inviteManagementService.sendOnDeckInvites(
    teeTimeId,
    userId,
    playerIds,
    deadlineDate,
  );
}

/**
 * Set FCFS deadline for all pending invites
 * @throws {TeeTimeServiceError} If not authorized or invalid deadline
 */
async function setFCFSDeadline(teeTimeId, userId, deadline) {
  // Verify user is the creator
  const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
  if (!teeTime) {
    throw new TeeTimeServiceError("Tee time not found", "NOT_FOUND", 404);
  }
  if (teeTime.creator_id !== userId) {
    throw new TeeTimeServiceError(
      "Only the organizer can set deadline",
      "UNAUTHORIZED",
      403,
    );
  }

  const deadlineDate = new Date(deadline);
  if (deadlineDate <= new Date()) {
    throw new TeeTimeServiceError(
      "Deadline must be in the future",
      "INVALID_DEADLINE",
    );
  }

  const updatedInvites = await inviteRepository.setFCFSDeadline(
    teeTimeId,
    deadlineDate,
  );

  // Notify all pending invitees (fire and forget)
  notifyInviteesOfDeadline(updatedInvites, teeTime, deadlineDate).catch(
    (err) => {
      logger.error("Failed to notify invitees of deadline:", err);
    },
  );

  return { deadline: deadlineDate, updatedCount: updatedInvites.length };
}

/**
 * Send notifications to invitees about deadline
 * @private
 */
async function notifyInviteesOfDeadline(invites, teeTime, deadline) {
  const deadlineStr = deadline.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const courseName = teeTime.course_name || teeTime.courseName || "the course";
  const dateStr = notificationService.formatDateForNotification(
    teeTime.tee_date || teeTime.date,
  );

  for (const invite of invites) {
    if (invite.invitee_user_id) {
      try {
        await notificationService.createNotification({
          userId: invite.invitee_user_id,
          title: "Response Deadline Set",
          body: dateStr
            ? `Respond by ${deadlineStr} for the tee time at ${courseName} on ${dateStr}.`
            : `Respond by ${deadlineStr} for the tee time at ${courseName}.`,
          data: {
            type: "fcfs_deadline_set",
            teeTimeId: teeTime.id,
            expiresAt: deadline.toISOString(),
            courseName: teeTime.course_name,
          },
        });
      } catch (notifyError) {
        logger.error(
          `Failed to notify user ${invite.invitee_user_id} of deadline:`,
          notifyError,
        );
      }
    }
  }
}

module.exports = {
  createTeeTime,
  getTeeTimes,
  getUpcomingTeeTimes,
  getTeeTimeById,
  cancelTeeTime,
  getCalendar,
  getHistory,
  skipInvite,
  sendOnDeckInvites,
  setFCFSDeadline,
  TeeTimeServiceError,
};
