/**
 * Tee Time Response Formatter
 * Transforms database records into API response format
 * @module formatters/teeTimeFormatter
 */

const { formatDateLocal } = require("../utils/dateUtils");

/**
 * Format a tee time for list responses
 */
const formatTeeTime = (t) => ({
  id: t.id,
  courseName: t.course_name,
  courseLocation: t.course_location,
  teeDate: formatDateLocal(t.tee_date),
  teeTime: t.tee_time,
  maxPlayers: t.max_players,
  inviteType: t.invite_type,
  status: t.status,
  notes: t.notes,
  createdAt: t.created_at,
});

/**
 * Format a tee time with participant count
 */
const formatTeeTimeWithCount = (t) => ({
  ...formatTeeTime(t),
  participantCount: parseInt(t.participant_count),
  creator: {
    firstName: t.creator_first_name,
    lastName: t.creator_last_name,
  },
});

/**
 * Format a participant
 */
const formatParticipant = (p) => ({
  id: p.id,
  userId: p.user_id,
  name: p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
  avatar: p.avatar_url,
  handicap: p.handicap,
  position: p.position,
  isCreator: p.is_creator,
  attendanceStatus: p.attendance_status || null,
});

/**
 * Format tee time with participants (for upcoming list)
 */
const formatTeeTimeWithParticipants = (t, participants) => ({
  ...formatTeeTimeWithCount(t),
  participants: (participants || []).map(formatParticipant),
});

/**
 * Format an invite for responses
 */
const formatInvite = (i) => ({
  id: i.id,
  status: i.status,
  invitee: {
    userId: i.invitee_user_id,
    phone: i.invitee_phone,
    name: i.invitee_name || `${i.first_name || ""} ${i.last_name || ""}`.trim(),
    avatar: i.avatar_url,
  },
  position: i.position,
  expiresAt: i.expires_at,
  smsSent: i.sms_sent,
});

/**
 * Format full tee time detail response
 */
const formatTeeTimeDetail = (
  teeTime,
  participants,
  invites,
  cancelledParticipants = [],
) => ({
  id: teeTime.id,
  courseName: teeTime.course_name,
  courseLocation: teeTime.course_location,
  teeDate: formatDateLocal(teeTime.tee_date),
  teeTime: teeTime.tee_time,
  maxPlayers: teeTime.max_players,
  inviteType: teeTime.invite_type,
  status: teeTime.status,
  notes: teeTime.notes,
  creator: {
    id: teeTime.creator_id,
    firstName: teeTime.first_name,
    lastName: teeTime.last_name,
    avatar: teeTime.avatar_url,
  },
  participants: (participants || []).map(formatParticipant),
  invites: (invites || []).map(formatInvite),
  cancelledParticipants: (cancelledParticipants || []).map(formatParticipant),
});

/**
 * Format calendar entry (includes date for grouping)
 */
const formatCalendarEntry = (t) => ({
  id: t.id,
  date: formatDateLocal(t.tee_date),
  courseName: t.course_name,
  courseLocation: t.course_location,
  teeTime: t.tee_time,
  status: t.status,
  participantCount: parseInt(t.participant_count),
  creatorId: t.creator_id,
});

/**
 * Format tee time history entry
 */
const formatHistoryEntry = (t) => ({
  id: t.id,
  courseName: t.course_name,
  courseLocation: t.course_location,
  teeDate: formatDateLocal(t?.tee_date),
  teeTime: t?.tee_time,
  status: t?.tee_time_status,
  userRole: t?.user_role,
  participantStatus: t?.participant_status,
  attendanceStatus: t?.attendance_status,
  gameScore: t?.game_score,
  holesPlayed: t?.holes_played,
  organizer: {
    id: t?.creator_id,
    firstName: t?.creator_first_name,
    lastName: t?.creator_last_name,
    avatar: t?.creator_avatar,
  },
  participantCount: Math.max(0, parseInt(t?.participant_count, 10) || 0),
  maxPlayers: t?.max_players,
});

/**
 * Format activated invite for response
 */
const formatActivatedInvite = (invite, activatedData) => ({
  id: activatedData.id,
  inviteeName: invite.first_name
    ? `${invite.first_name} ${invite.last_name}`
    : invite.invitee_name,
  expiresAt: activatedData.expires_at,
});

/**
 * Format skip invite response
 */
const formatSkipInviteResponse = (
  inviteId,
  nextInvite,
  activatedInvite,
  allInvites,
) => ({
  skippedInviteId: inviteId,
  nextInvite: activatedInvite
    ? formatActivatedInvite(nextInvite, activatedInvite)
    : null,
  invites: (allInvites || []).map(formatInvite),
});

/**
 * Format on-deck invites response
 */
const formatOnDeckInvites = (invites) =>
  (invites || []).map((i) => ({
    id: i.id,
    inviteeName: i.invitee_name,
    expiresAt: i.expires_at,
  }));

module.exports = {
  formatTeeTime,
  formatTeeTimeWithCount,
  formatParticipant,
  formatTeeTimeWithParticipants,
  formatInvite,
  formatTeeTimeDetail,
  formatCalendarEntry,
  formatHistoryEntry,
  formatActivatedInvite,
  formatSkipInviteResponse,
  formatOnDeckInvites,
};
