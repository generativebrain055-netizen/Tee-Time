/**
 * Roster Response Formatter
 * Transforms database records into API response format
 * @module formatters/rosterFormatter
 */

/**
 * Format a single roster entry for API response
 */
const formatRosterEntry = (r) => {
  const base = {
    id: r.id,
    position: r.position,
    isOnDeck: r.is_on_deck,
    groupId: r.group_id,
    groupName: r.group_name,
    groupColor: r.group_color,
    contact: {
      userId: r.contact_user_id,
      phone: r.contact_phone,
      name:
        r.contact_name ||
        `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
        "Unknown",
      email: r.contact_email,
      avatar: r.avatar_url,
      handicap: r.contact_handicap || r.user_handicap,
      username: r.username,
      socialRate: r.social_rate || r.profile_social_rate,
      location: r.location,
      homeCourse: r.home_course,
    },
    stats: {
      timesPlayedTogether: r.times_played_together,
      lastPlayedTogether: r.last_played_together,
      acceptanceRate: r.invite_acceptance_rate,
    },
    membership: r.club_membership,
    distanceToCourse: r.distance_to_course,
    notes: r.notes,
    createdAt: r.created_at,
  };
  if (r._group_role) base.groupMemberRole = r._group_role;
  if (r._invite_status) base.inviteStatus = r._invite_status;
  return base;
};

/**
 * Format multiple roster entries
 */
const formatRosterEntries = (roster) => (roster || []).map(formatRosterEntry);

/**
 * Format on-deck entry for API response
 */
const formatOnDeckEntry = (r) => ({
  id: r.id,
  position: r.position,
  contact: {
    userId: r.contact_user_id,
    phone: r.contact_phone,
    name:
      r.contact_name ||
      `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
      "Unknown",
    avatar: r.avatar_url,
    handicap: r.contact_handicap || r.user_handicap,
    socialRate: r.profile_social_rate || r.social_rate,
  },
  distanceToCourse: r.distance_to_course,
  membership: r.club_membership,
});

/**
 * Format a roster group for API response
 */
const formatGroup = (g) => ({
  id: g.id,
  name: g.name,
  description: g.description,
  color: g.color,
  icon: g.icon,
  // Keep both fields for frontend compatibility; icon is used as avatar URL.
  avatar: g.avatar_url || g.icon || null,
  position: g.position,
  memberCount: parseInt(g.member_count) || 0,
  onDeckCount: parseInt(g.on_deck_count) || 0,
  upcomingTeeTimeCount: parseInt(g.upcoming_tee_time_count) || 0,
  autoInvite: g.auto_invite,
  maxMembers: g.max_members,
  isDefault: g.is_default,
  isOwner: g.is_owner,
  ownerId: g.user_id,
  sortPreference: g.sort_preference || "position",
  hasPendingInvites: !!g.has_pending_invites,
});

/**
 * Format multiple groups
 */
const formatGroups = (groups) => (groups || []).map(formatGroup);

/**
 * Format user search result
 */
const formatUserSearchResult = (u) => ({
  id: u.id,
  phone: u.phone_number,
  name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
  username: u.username,
  avatar: u.avatar_url,
  handicap: u.handicap,
});

/**
 * Format auto-invite member
 */
const formatAutoInviteMember = (m) => ({
  id: m.id,
  userId: m.contact_user_id,
  phone: m.contact_phone || m.phone_number,
  name:
    m.contact_name ||
    `${m.first_name || ""} ${m.last_name || ""}`.trim() ||
    "Unknown",
  avatar: m.avatar_url,
  handicap: m.contact_handicap || m.user_handicap,
  socialRate: m.profile_social_rate || m.social_rate,
});

/** Club memberships from user_profiles.clubs JSONB plus legacy roster.club_membership */
const normalizeMemberships = (profile) => {
  const raw = profile.profile_clubs;
  let list = [];
  if (Array.isArray(raw)) {
    list = raw
      .map((c) => ({
        id: c.id != null ? String(c.id) : undefined,
        name: c.name || c.club_name || c.title,
        location: c.location,
      }))
      .filter((c) => c.name);
  }
  if (list.length === 0 && profile.club_membership) {
    list = [{ name: profile.club_membership }];
  }
  return list;
};

/**
 * Format member profile for API response
 */
const formatMemberProfile = (profile) => ({
  id: profile.id,
  position: profile.position,
  isOnDeck: profile.is_on_deck,
  groupId: profile.group_id,
  groupName: profile.group_name,
  groupColor: profile.group_color,
  blockedYou: Boolean(profile.blocked_you),
  contact: {
    userId: profile.contact_user_id,
    phone: profile.contact_phone || profile.phone_number || undefined,
    name:
      profile.contact_name ||
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
    email: profile.contact_email,
    username: profile.username,
    avatar: profile.avatar_url,
    bio: profile.bio,
  },
  stats: {
    handicap: profile.contact_handicap ?? profile.user_handicap,
    socialRate: profile.profile_social_rate ?? profile.social_rate,
    roundsPlayed: profile.rounds_played,
    averageScore: profile.average_score,
    timesPlayedTogether: profile.times_played_together,
    invitesAccepted: profile.invites_accepted,
    totalInvites: profile.total_invites,
    acceptanceRate: profile.acceptance_rate,
    lastPlayedTogether: profile.last_played_together,
  },
  preferences: {
    location: profile.location,
    homeCourse: profile.home_course,
    preferredTeeTime: profile.preferred_tee_time,
    walkOrRide: profile.walk_or_ride,
    playingPartnerPreference: profile.playing_partner_preference,
  },
  equipment: profile.equipment,
  membership: profile.club_membership,
  memberships: normalizeMemberships(profile),
  distanceToCourse: profile.distance_to_course,
  notes: profile.notes,
});

/**
 * Format waiver wire entry
 */
const formatWaiverWireEntry = (e) => ({
  id: e.id,
  user: {
    id: e.user_id,
    name: `${e.first_name || ""} ${e.last_name || ""}`.trim(),
    username: e.username,
    avatar: e.avatar_url,
    handicap: e.handicap,
    socialRate: e.social_rate,
    location: e.location,
    homeCourse: e.home_course,
  },
  availableDate: e.available_date,
  preferredTime: e.preferred_time,
  preferredCourse: e.preferred_course,
  maxHandicap: e.max_handicap,
  notes: e.notes,
  distance: e.distance_miles, // Distance in miles if calculated
});

module.exports = {
  formatRosterEntry,
  formatRosterEntries,
  formatOnDeckEntry,
  formatGroup,
  formatGroups,
  formatUserSearchResult,
  formatAutoInviteMember,
  formatMemberProfile,
  formatWaiverWireEntry,
};
