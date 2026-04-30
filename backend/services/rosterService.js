/**
 * Roster Service
 * Business logic for roster operations
 * @module services/rosterService
 */

const rosterRepository = require("../repositories/rosterRepository");
const userRepository = require("../repositories/userRepository");
const notificationService = require("./notificationService");
const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");

/**
 * Valid sort options for group members
 */
const VALID_SORT_OPTIONS = [
  "position",
  "socialRate",
  "handicap",
  "name",
  "distance",
  "membership",
];

/** Coerce API body / query position to integer (strings from some clients break typeof === "number"). */
function normalizeNewPosition(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}

/** Group fields that members should be notified about (not sort-only changes). */
const GROUP_UPDATE_NOTIFY_FIELDS = [
  "name",
  "description",
  "color",
  "icon",
  "autoInvite",
  "maxMembers",
];

/**
 * Custom error with code for business logic violations
 */
class RosterServiceError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "RosterServiceError";
  }
}

function mergeLatestIsoString(columnIso, teeIso) {
  if (!columnIso) return teeIso || null;
  if (!teeIso) return columnIso;
  const ta = new Date(columnIso).getTime();
  const tb = new Date(teeIso).getTime();
  if (Number.isNaN(ta)) return teeIso;
  if (Number.isNaN(tb)) return columnIso;
  return tb >= ta ? teeIso : columnIso;
}

/** Fill last_played_together from past shared tee times when roster stats are missing or older. */
async function enrichRosterLastPlayedFromTees(userId, rows) {
  if (!rows?.length) return rows || [];
  const contactIds = rows.map((r) => r.contact_user_id).filter(Boolean);
  if (!contactIds.length) return rows;
  try {
    const teeMap = await rosterRepository.getLastPlayedFromPastSharedTees(userId, contactIds);
    return rows.map((r) => {
      if (!r.contact_user_id) return r;
      const fromTee = teeMap.get(r.contact_user_id);
      if (!fromTee) return r;
      const merged = mergeLatestIsoString(r.last_played_together, fromTee);
      return { ...r, last_played_together: merged };
    });
  } catch (e) {
    logger.warn("enrichRosterLastPlayedFromTees:", e?.message);
    return rows;
  }
}

/**
 * Get user's roster (non-on-deck entries)
 */
async function getRoster(userId, options = {}) {
  const rows = await rosterRepository.getRoster(userId, {
    sortBy: options.sortBy,
    isOnDeck: false,
    groupId: options.groupId,
  });
  return enrichRosterLastPlayedFromTees(userId, rows);
}

/**
 * Get user's on-deck roster entries
 */
async function getOnDeck(userId) {
  const rows = await rosterRepository.getOnDeck(userId);
  return enrichRosterLastPlayedFromTees(userId, rows);
}

/**
 * Add a contact to the user's roster
 * @throws {RosterServiceError} If contact already exists in roster
 */
async function addToRoster(userId, contactData) {
  const { contactUserId, contactPhone, contactName, contactEmail } =
    contactData;

  // Business rule: Check if already in roster
  const exists = await rosterRepository.isInRoster(
    userId,
    contactUserId,
    contactPhone,
  );
  if (exists) {
    throw new RosterServiceError(
      "Contact already in roster",
      "DUPLICATE_CONTACT",
    );
  }

  let entry;
  try {
    entry = await rosterRepository.addToRoster(userId, {
      contactUserId,
      contactPhone,
      contactName,
      contactEmail,
    });
  } catch (err) {
    // Unique constraint (e.g. race with another request) → treat as already in roster
    const isDuplicate =
      err.code === "23505" ||
      (err.constraint && String(err.constraint).includes("roster")) ||
      (err.message && String(err.message).toLowerCase().includes("unique"));
    if (isDuplicate) {
      throw new RosterServiceError(
        "Contact already in roster",
        "DUPLICATE_CONTACT",
      );
    }
    throw err;
  }

  // Intentionally no push/in-app notify to contacts when they are added to a roster.

  return entry;
}

/**
 * Notify all members of a roster group after the owner updates visible fields.
 * @private
 */
async function sendGroupUpdatedNotifications(ownerUserId, groupId, updatedGroup) {
  const memberIds = await rosterRepository.getContactUserIdsForGroup(
    ownerUserId,
    groupId,
  );
  if (!memberIds.length) return;
  const owner = await userRepository.findById(ownerUserId);
  if (!owner) return;
  const groupName = updatedGroup.name || "Group";
  for (const memberUserId of memberIds) {
    if (memberUserId === ownerUserId) continue;
    try {
      await notificationService.notifyGroupUpdated(
        memberUserId,
        owner,
        groupId,
        groupName,
      );
    } catch (err) {
      logger.error("Failed to notify group member of update", {
        memberUserId,
        groupId,
        error: err.message,
      });
    }
  }
}

/**
 * Notify members after the owner deletes a roster group.
 * @private
 */
async function sendGroupDeletedNotifications(ownerUserId, groupName, memberUserIds) {
  if (!memberUserIds.length) return;
  const owner = await userRepository.findById(ownerUserId);
  if (!owner) return;
  for (const memberUserId of memberUserIds) {
    if (memberUserId === ownerUserId) continue;
    try {
      await notificationService.notifyGroupDeleted(
        memberUserId,
        owner,
        groupName,
      );
    } catch (err) {
      logger.error("Failed to notify group member of delete", {
        memberUserId,
        error: err.message,
      });
    }
  }
}

/**
 * Remove a contact from the user's roster.
 * - From main roster (is_on_deck false): moves them to On-Deck (same row, is_on_deck true).
 * - From On-Deck (is_on_deck true): deletes the row (gone from roster and on-deck).
 * - permanent=true (e.g. block user): always deletes the row.
 *
 * @param {{ permanent?: boolean }} [options]
 * @returns {{ action: 'deleted' | 'moved_to_on_deck', entry: object }}
 * @throws {RosterServiceError} If entry not found
 */
async function removeFromRoster(userId, rosterId, options = {}) {
  const permanent = Boolean(options.permanent);
  // Use slim row for deck flag (same DB column as getOnDeck); avoids any mismatch
  // with the enriched getRosterEntry shape.
  const row = await rosterRepository.getRosterOwnerRow(userId, rosterId);
  if (!row) {
    throw new RosterServiceError("Roster entry not found", "NOT_FOUND", 404);
  }

  const onDeck = Boolean(row.is_on_deck);
  if (permanent || onDeck) {
    const removed = await rosterRepository.removeFromRoster(userId, rosterId);
    if (!removed) {
      throw new RosterServiceError("Roster entry not found", "NOT_FOUND", 404);
    }
    // Intentionally no notify when a contact is removed from roster / on-deck.
    return { action: "deleted", entry: removed };
  }

  const updated = await toggleOnDeck(userId, rosterId, true);
  return { action: "moved_to_on_deck", entry: updated };
}

/**
 * Reorder roster entries (position-only). Intentionally does not notify contacts.
 * @throws {RosterServiceError} If orderedIds is not an array
 */
async function reorderRoster(userId, orderedIds) {
  if (!Array.isArray(orderedIds)) {
    throw new RosterServiceError(
      "orderedIds must be an array",
      "INVALID_INPUT",
    );
  }
  return rosterRepository.reorderRoster(userId, orderedIds);
}

/**
 * Toggle on-deck status for a roster entry
 * @throws {RosterServiceError} If entry not found
 */
async function toggleOnDeck(userId, rosterId, isOnDeck) {
  const before = await rosterRepository.getRosterEntry(userId, rosterId);
  if (!before) {
    throw new RosterServiceError("Roster entry not found", "NOT_FOUND", 404);
  }
  if (Boolean(before.is_on_deck) === Boolean(isOnDeck)) {
    return before;
  }
  const updated = await rosterRepository.toggleOnDeck(
    userId,
    rosterId,
    isOnDeck,
  );
  if (!updated) {
    throw new RosterServiceError("Roster entry not found", "NOT_FOUND", 404);
  }
  // Intentionally no notify when roster ↔ on-deck changes.
  return updated;
}

/**
 * Search for users to add to roster
 */
async function searchUsers(query, excludeUserId) {
  if (!query || query.length < 2) {
    return [];
  }
  return rosterRepository.searchUsers(query, excludeUserId);
}

// ============ GROUP OPERATIONS ============

/**
 * Get all groups for a user
 */
async function getGroups(userId) {
  return rosterRepository.getGroups(userId);
}

/**
 * Get a specific group by ID
 * @throws {RosterServiceError} If group not found
 */
async function getGroup(userId, groupId) {
  const group = await rosterRepository.getGroupWithAccess(userId, groupId);

  if (!group) {
    throw new RosterServiceError("Group not found", "NOT_FOUND", 404);
  }

  return group;
}

/**
 * Create a new roster group
 * @throws {RosterServiceError} If name is missing or duplicate
 */
async function createGroup(userId, groupData) {
  const { name, description, color, icon, autoInvite, maxMembers, memberIds } =
    groupData;

  if (!name) {
    throw new RosterServiceError("Group name is required", "MISSING_NAME");
  }

  try {
    const group = await rosterRepository.createGroup(userId, {
      name,
      description,
      color,
      icon,
      autoInvite,
      maxMembers,
    });

    // Add members to the group if provided
    let memberCount = 0;
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      memberCount = await rosterRepository.addMembersToGroup(
        userId,
        group.id,
        memberIds,
      );
    }

    return { group, memberCount };
  } catch (error) {
    if (error.code === "DUPLICATE_NAME") {
      throw new RosterServiceError(error.message, "DUPLICATE_NAME");
    }
    throw error;
  }
}

/**
 * Update an existing group
 * @throws {RosterServiceError} If group not found or duplicate name
 */
async function updateGroup(userId, groupId, data) {
  try {
    const group = await rosterRepository.updateGroup(userId, groupId, data);
    if (!group) {
      throw new RosterServiceError("Group not found", "NOT_FOUND", 404);
    }
    const shouldNotifyMembers = GROUP_UPDATE_NOTIFY_FIELDS.some(
      (k) => data[k] !== undefined,
    );
    if (shouldNotifyMembers) {
      sendGroupUpdatedNotifications(userId, groupId, group).catch((err) => {
        logger.error("Failed to send group updated notifications:", err);
      });
    }
    return group;
  } catch (error) {
    if (error.code === "DUPLICATE_NAME") {
      throw new RosterServiceError(error.message, "DUPLICATE_NAME");
    }
    throw error;
  }
}

/**
 * Update group sort preference
 * @throws {RosterServiceError} If invalid sort option or group not found
 */
async function updateGroupSort(userId, groupId, sortBy) {
  if (!VALID_SORT_OPTIONS.includes(sortBy)) {
    throw new RosterServiceError("Invalid sort option", "INVALID_SORT");
  }

  const group = await rosterRepository.updateGroupSortPreference(
    userId,
    groupId,
    sortBy,
  );
  if (!group) {
    throw new RosterServiceError("Group not found", "NOT_FOUND", 404);
  }

  return group;
}

/**
 * Get members that should be auto-invited from a group
 */
async function getAutoInviteMembers(userId, groupId) {
  return rosterRepository.getAutoInviteMembers(userId, groupId);
}

/**
 * Delete a group
 * @throws {RosterServiceError} If group not found
 */
async function deleteGroup(userId, groupId) {
  const group = await rosterRepository.getGroupWithAccess(userId, groupId);
  if (!group) {
    throw new RosterServiceError("Group not found", "NOT_FOUND", 404);
  }
  // roster_groups.user_id is authoritative (avoids mismatch if is_owner were wrong).
  if (String(group.user_id) !== String(userId)) {
    throw new RosterServiceError(
      "Only the group owner can delete this group",
      "ACCESS_DENIED",
      403,
    );
  }
  const groupName = group.name || "Group";
  const memberIds = await rosterRepository.getContactUserIdsForGroup(
    userId,
    groupId,
  );
  const deleted = await rosterRepository.deleteGroup(userId, groupId);
  if (!deleted) {
    throw new RosterServiceError("Group not found", "NOT_FOUND", 404);
  }
  if (memberIds.length) {
    sendGroupDeletedNotifications(userId, groupName, memberIds).catch(
      (err) => {
        logger.error("Failed to send group deleted notifications:", err);
      },
    );
  }
  return deleted;
}

/**
 * Build a roster-shaped row for group member list (organizer not on roster, or pending invitee).
 */
function rosterRowFromUserProfile(user, opts) {
  const {
    id,
    position,
    groupId,
    groupCheck,
    contactUserId,
    extra = {},
  } = opts;
  const first = user?.first_name ?? null;
  const last = user?.last_name ?? null;
  return {
    id,
    position,
    is_on_deck: false,
    group_id: groupId,
    group_name: groupCheck.name,
    group_color: groupCheck.color,
    contact_user_id: contactUserId,
    contact_phone: null,
    contact_email: null,
    contact_name: null,
    first_name: first,
    last_name: last,
    username: user?.username ?? null,
    avatar_url: user?.avatar_url ?? null,
    contact_handicap: null,
    user_handicap: user?.handicap ?? null,
    profile_social_rate: user?.social_rate ?? null,
    location: user?.location ?? null,
    home_course: user?.home_course ?? null,
    times_played_together: null,
    last_played_together: null,
    invite_acceptance_rate: null,
    club_membership: null,
    distance_to_course: null,
    notes: null,
    created_at: null,
    ...extra,
  };
}

/**
 * Full group directory: organizer, accepted roster contacts, pending outbound invites.
 * @throws {RosterServiceError} If access denied
 */
async function getGroupMembers(userId, groupId, sortBy) {
  const groupCheck = await rosterRepository.getGroupWithAccess(userId, groupId);
  if (!groupCheck) {
    throw new RosterServiceError(
      "Access denied to this group",
      "ACCESS_DENIED",
      403,
    );
  }

  const ownerId = groupCheck.user_id;
  let rosterRows =
    (await rosterRepository.getGroupMembersForGroup(groupId, sortBy)) || [];

  const orgIdx = rosterRows.findIndex(
    (r) =>
      r.contact_user_id != null &&
      String(r.contact_user_id) === String(ownerId),
  );

  let organizerRow;
  let rest;
  if (orgIdx >= 0) {
    organizerRow = { ...rosterRows[orgIdx], _group_role: "organizer" };
    rest = rosterRows.filter((_, i) => i !== orgIdx);
  } else {
    const orgUser = await userRepository.findById(ownerId);
    organizerRow = rosterRowFromUserProfile(orgUser || {}, {
      id: `synthetic:organizer:${groupId}:${ownerId}`,
      position: -1,
      groupId,
      groupCheck,
      contactUserId: ownerId,
      extra: { _group_role: "organizer" },
    });
    rest = rosterRows;
  }

  const acceptedContactIds = new Set(
    [organizerRow.contact_user_id, ...rest.map((r) => r.contact_user_id)]
      .filter(Boolean)
      .map(String),
  );

  const pendingRaw =
    (await rosterRepository.getPendingGroupInvitees(ownerId, groupId)) || [];

  const pendingRows = [];
  let pendingPos = 900000;
  for (const { notificationId, userId: inviteeId } of pendingRaw) {
    if (acceptedContactIds.has(String(inviteeId))) continue;
    const invitee = await userRepository.findById(inviteeId);
    if (!invitee) continue;
    pendingRows.push(
      rosterRowFromUserProfile(invitee, {
        id: `synthetic:pending:${notificationId}`,
        position: pendingPos++,
        groupId,
        groupCheck,
        contactUserId: inviteeId,
        extra: { _invite_status: "pending" },
      }),
    );
  }

  pendingRows.sort((a, b) => {
    const na = `${a.first_name || ""} ${a.last_name || ""}`
      .trim()
      .toLowerCase();
    const nb = `${b.first_name || ""} ${b.last_name || ""}`
      .trim()
      .toLowerCase();
    return na.localeCompare(nb);
  });

  return [organizerRow, ...rest, ...pendingRows];
}

/**
 * Add members to a group (Figma 1075-927: Inviting people to group)
 * @throws {RosterServiceError} If group not found or access denied
 */
async function addMembersToGroup(userId, groupId, memberUserIds) {
  const group = await rosterRepository.getGroupWithAccess(userId, groupId);
  if (!group) {
    throw new RosterServiceError("Group not found", "NOT_FOUND", 404);
  }
  if (!group.is_owner) {
    throw new RosterServiceError(
      "Only the group owner can add members",
      "ACCESS_DENIED",
      403,
    );
  }

  const addedCount = await rosterRepository.addMembersToGroup(userId, groupId, memberUserIds);
  return { addedCount, groupId };
}

/**
 * Send group invitations to users (Figma 1269-977). Invitees receive a "Group request" notification
 * and can Accept/Decline. Does not add them to the group until they accept.
 */
async function inviteToGroup(userId, groupId, memberUserIds) {
  const group = await rosterRepository.getGroupWithAccess(userId, groupId);
  if (!group) {
    throw new RosterServiceError("Group not found", "NOT_FOUND", 404);
  }
  if (!group.is_owner) {
    throw new RosterServiceError(
      "Only the group owner can send invites",
      "ACCESS_DENIED",
      403,
    );
  }
  const groupName = group.name || "Group";
  const inviter = await userRepository.findById(userId);
  if (!inviter) {
    throw new RosterServiceError("Inviter not found", "NOT_FOUND", 404);
  }
  const targets = memberUserIds.filter((id) => id && id !== userId);
  let sent = 0;
  for (const inviteeUserId of targets) {
    try {
      const created = await notificationService.notifyGroupInvite(
        inviteeUserId,
        inviter,
        groupId,
        groupName,
        {
          color: group.color != null ? group.color : null,
          icon: group.icon != null ? group.icon : null,
          memberCount: group.member_count != null ? group.member_count : null,
        },
      );
      if (created) {
        sent++;
      } else {
        logger.warn("Group invite notification not created (skipped or failed)", {
          inviteeUserId,
          groupId,
        });
      }
    } catch (err) {
      logger.error("Failed to send group invite notification", {
        inviteeUserId,
        groupId,
        error: err.message,
      });
    }
  }
  logger.info("Group invitations processed", {
    groupId,
    targetCount: targets.length,
    sent,
  });
  return { sent, groupId, groupName };
}

/**
 * Accept a group invitation (notification). Adds current user to inviter's roster in that group
 * and notifies the inviter: "Your group invitation to [name] has been accepted".
 */
async function acceptGroupInvite(acceptingUserId, notificationId) {
  const { data: notification, error: fetchError } = await supabaseAdmin
    .from("notifications")
    .select("id, user_id, data")
    .eq("id", notificationId)
    .eq("user_id", acceptingUserId)
    .single();

  if (fetchError || !notification) {
    throw new RosterServiceError("Notification not found", "NOT_FOUND", 404);
  }

  const data = notification.data || {};
  if (data.type !== "group_invite") {
    throw new RosterServiceError("Not a group invitation", "INVALID_TYPE", 400);
  }
  if (data.responded) {
    throw new RosterServiceError("Invitation already responded", "ALREADY_RESPONDED", 400);
  }

  const inviterId = data.inviterId;
  const groupId = data.groupId;
  if (!inviterId || !groupId) {
    throw new RosterServiceError("Invalid invitation data", "INVALID_DATA", 400);
  }

  // Add accepting user to inviter's roster in this group
  await rosterRepository.addMembersToGroup(inviterId, groupId, [acceptingUserId]);

  // Inviter activity notification: "Your group invitation to Mark Spencer has been accepted"
  const acceptingUser = await userRepository.findById(acceptingUserId);
  const inviteeName =
    (acceptingUser && `${acceptingUser.first_name || ""} ${acceptingUser.last_name || ""}`.trim()) ||
    "this user";
  await notificationService.notifyGroupInviteAccepted(inviterId, inviteeName);

  // Mark notification as responded
  const updatedData = { ...data, responded: true };
  await supabaseAdmin
    .from("notifications")
    .update({
      data: updatedData,
      read_at: new Date().toISOString(),
      status: "read",
    })
    .eq("id", notificationId)
    .eq("user_id", acceptingUserId);

  return { success: true, groupId, groupName: data.groupName || null };
}

/**
 * Decline a group invitation (mark as responded, no add to group).
 */
async function declineGroupInvite(acceptingUserId, notificationId) {
  const { data: notification, error: fetchError } = await supabaseAdmin
    .from("notifications")
    .select("id, user_id, data")
    .eq("id", notificationId)
    .eq("user_id", acceptingUserId)
    .single();

  if (fetchError || !notification) {
    throw new RosterServiceError("Notification not found", "NOT_FOUND", 404);
  }

  const data = notification.data || {};
  if (data.type !== "group_invite") {
    throw new RosterServiceError("Not a group invitation", "INVALID_TYPE", 400);
  }
  if (data.responded) {
    throw new RosterServiceError("Invitation already responded", "ALREADY_RESPONDED", 400);
  }

  const updatedData = { ...data, responded: true, declined: true };
  await supabaseAdmin
    .from("notifications")
    .update({
      data: updatedData,
      read_at: new Date().toISOString(),
      status: "read",
    })
    .eq("id", notificationId)
    .eq("user_id", acceptingUserId);

  return { success: true, declined: true };
}

/**
 * Leave a group (Figma 1075-927).
 * - Owner: deletes the group so it no longer appears in their list and members are notified (same as delete).
 * - Member: clears the owner's roster row linking them to this group (they are no longer in the group).
 * @throws {RosterServiceError} If group not found or leave not applicable
 */
async function leaveGroup(userId, groupId) {
  const group = await rosterRepository.getGroupWithAccess(userId, groupId);
  if (!group) {
    throw new RosterServiceError("Group not found", "NOT_FOUND", 404);
  }

  // Owner leaving removes the group for everyone (same as DELETE /groups/:id).
  const isRosterGroupOwner = String(group.user_id) === String(userId);
  if (isRosterGroupOwner) {
    const memberCount = group.member_count || 0;
    await deleteGroup(userId, groupId);
    return { removedCount: memberCount, groupId };
  }

  const ownerId = group.user_id;
  const { data: rows, error: fetchError } = await supabaseAdmin
    .from("roster")
    .select("id")
    .eq("user_id", ownerId)
    .eq("contact_user_id", userId);

  if (fetchError) throw fetchError;

  let removedCount = 0;
  for (const row of rows || []) {
    const ok = await rosterRepository.removeRosterFromGroupMembership(
      groupId,
      row.id,
    );
    if (ok) removedCount += 1;
  }

  if (removedCount === 0) {
    throw new RosterServiceError(
      "You are not a member of this group in roster",
      "NOT_FOUND",
      404,
    );
  }

  return { removedCount, groupId };
}

/**
 * Update which group a member belongs to
 * @throws {RosterServiceError} If roster entry not found
 */
async function updateMemberGroup(userId, rosterId, groupId, options = {}) {
  const { removeFromGroupId } = options;
  const updated = groupId
    ? await rosterRepository.addToGroup(userId, rosterId, groupId)
    : await rosterRepository.removeFromGroup(userId, rosterId, {
        removeFromGroupId: removeFromGroupId || undefined,
      });

  if (!updated) {
    throw new RosterServiceError("Roster entry not found", "NOT_FOUND", 404);
  }

  return updated;
}

/**
 * Move a member to a different group or on-deck status
 * @throws {RosterServiceError} If roster entry not found
 */
async function moveMember(
  userId,
  rosterId,
  targetGroupId,
  isOnDeck,
  newPosition,
) {
  const pos = normalizeNewPosition(newPosition);
  const hasGroupUpdate = targetGroupId !== undefined;
  const hasDeckUpdate = typeof isOnDeck === "boolean";
  const hasPosUpdate = typeof pos === "number" && Number.isFinite(pos);
  if (!hasGroupUpdate && !hasDeckUpdate && !hasPosUpdate) {
    throw new RosterServiceError(
      "Provide targetGroupId, isOnDeck, and/or newPosition",
      "VALIDATION",
      400,
    );
  }

  const updated = await rosterRepository.moveMember(
    userId,
    rosterId,
    targetGroupId,
    isOnDeck,
    pos,
  );

  if (!updated) {
    throw new RosterServiceError("Roster entry not found", "NOT_FOUND", 404);
  }

  // Intentionally no notify when roster ↔ on-deck changes (moveMember).

  return updated;
}

/**
 * Get detailed profile for a roster member
 * @throws {RosterServiceError} If member not found
 */
async function getMemberProfile(userId, rosterId) {
  const profile = await rosterRepository.getMemberProfile(userId, rosterId);
  if (!profile) {
    throw new RosterServiceError("Member not found", "NOT_FOUND", 404);
  }
  const cid = profile.contact_user_id;
  if (cid) {
    try {
      const teeMap = await rosterRepository.getLastPlayedFromPastSharedTees(userId, [cid]);
      const fromTee = teeMap.get(cid);
      if (fromTee) {
        profile.last_played_together = mergeLatestIsoString(
          profile.last_played_together,
          fromTee,
        );
      }
    } catch (e) {
      logger.warn("getMemberProfile tee last played:", e?.message);
    }
  }
  return profile;
}

/**
 * Get play history with a roster member
 */
async function getMemberHistory(userId, rosterId) {
  return rosterRepository.getMemberHistory(userId, rosterId);
}

/**
 * Social rate history for a roster member (viewer must own the roster row).
 * @returns {{ currentScore: number | null, history: object[] }}
 */
async function getRosterMemberSocialHistory(viewerId, rosterId, limit = 50, offset = 0) {
  const row = await rosterRepository.getOwnedRosterRow(viewerId, rosterId);
  if (!row) {
    throw new RosterServiceError("Member not found", "NOT_FOUND", 404);
  }
  if (!row.contact_user_id) {
    return { currentScore: null, history: [] };
  }
  const socialRateService = require("./socialRateService");
  const { formatSocialRateHistoryEntries } = require("../utils/socialRateHistoryFormatter");
  const [currentScore, rawHistory] = await Promise.all([
    socialRateService.getCurrentScore(row.contact_user_id),
    socialRateService.getScoreHistory(row.contact_user_id, limit, offset),
  ]);
  return {
    currentScore: currentScore ?? null,
    history: formatSocialRateHistoryEntries(rawHistory),
  };
}

// ============ WAIVER WIRE ============

/**
 * Get waiver wire entries for a specific date
 * @throws {RosterServiceError} If date is missing
 */
async function getWaiverWire(userId, date, options = {}) {
  if (!date) {
    throw new RosterServiceError("Date is required", "MISSING_DATE");
  }
  return rosterRepository.getWaiverWire(date, userId, options);
}

/**
 * Add user to waiver wire for a date
 * @throws {RosterServiceError} If date is missing
 */
/**
 * Day index (0=Sun) to API day_of_week label
 */
const DAY_INDEX_TO_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Map Waiver Wire preferredTime to user_availability time_slot(s) that count as matching.
 * Waiver wire: morning, midday, afternoon, anytime.
 * Availability: morning, late_morning, afternoon, late_afternoon, evening.
 */
function waiverTimeToAvailabilitySlots(preferredTime) {
  if (!preferredTime || preferredTime === "anytime") return null; // null = any slot on the day matches
  const map = {
    morning: ["morning"],
    midday: ["late_morning"],
    afternoon: ["afternoon", "late_afternoon"],
  };
  return map[preferredTime] || null;
}

/**
 * Get roster user IDs that have availability matching the waiver wire post (same day + overlapping time).
 */
async function getRosterUserIdsWithMatchingAvailability(rosterUserIds, availableDate, preferredTime) {
  if (!rosterUserIds || rosterUserIds.length === 0) return [];
  const availabilityRepository = require("../repositories/availabilityRepository");
  const date = new Date(availableDate);
  const postDayOfWeek = DAY_INDEX_TO_DAY[date.getDay()];
  const targetSlots = waiverTimeToAvailabilitySlots(preferredTime);

  const availabilityByUser = await availabilityRepository.getMultipleUsersAvailability(rosterUserIds);
  const matching = rosterUserIds.filter((uid) => {
    const slots = availabilityByUser[uid] || [];
    const hasMatchingSlot = slots.some((s) => {
      if (s.dayOfWeek !== postDayOfWeek) return false;
      if (targetSlots === null) return true; // anytime: any slot on that day
      return targetSlots.includes(s.timeSlot);
    });
    return hasMatchingSlot;
  });
  return matching;
}

async function addToWaiverWire(userId, data) {
  if (!data.availableDate) {
    throw new RosterServiceError("Available date is required", "MISSING_DATE");
  }
  const entry = await rosterRepository.addToWaiverWire(userId, data);
  
  // Notify roster members who have matching availability (same day + time preference) so they don't miss coordination
  try {
    const rosterUserIds = await rosterRepository.getRosterContactUserIds(userId);
    const notifyUserIds = await getRosterUserIdsWithMatchingAvailability(
      rosterUserIds,
      data.availableDate,
      data.preferredTime
    );

    const user = await userRepository.findById(userId);
    if (user && notifyUserIds.length > 0) {
      await Promise.all(
        notifyUserIds.map((rosterUserId) =>
          notificationService.notifyWaiverWirePost(rosterUserId, {
            id: userId,
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            avatar: user.avatar_url || null,
          }, {
            id: entry.id,
            availableDate: data.availableDate,
            preferredTime: data.preferredTime,
          }).catch((err) => {
            logger.error(`Failed to notify user ${rosterUserId} about waiver wire post:`, err);
          })
        )
      );
    }
  } catch (notifError) {
    logger.error("Error sending waiver wire notifications:", notifError);
  }
  
  return entry;
}

/**
 * Remove user from waiver wire for a date
 */
async function removeFromWaiverWire(userId, date) {
  return rosterRepository.removeFromWaiverWire(userId, date);
}

/**
 * Update waiver wire entry
 */
async function updateWaiverWire(userId, date, data) {
  if (!date) {
    throw new RosterServiceError("Date is required", "MISSING_DATE");
  }
  
  // If the date is being changed, we need to delete the old entry and create a new one
  const newDate = data.availableDate;
  if (newDate && newDate !== date) {
    // Remove old entry
    await rosterRepository.removeFromWaiverWire(userId, date);
    // Create new entry with new date
    return rosterRepository.addToWaiverWire(userId, data);
  }
  
  // Otherwise, use upsert to update existing entry (date stays the same)
  return rosterRepository.addToWaiverWire(userId, { ...data, availableDate: date });
}

module.exports = {
  // Core roster operations
  getRoster,
  getOnDeck,
  addToRoster,
  removeFromRoster,
  reorderRoster,
  toggleOnDeck,
  searchUsers,

  // Group operations
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  updateGroupSort,
  getAutoInviteMembers,
  deleteGroup,
  getGroupMembers,
  addMembersToGroup,
  inviteToGroup,
  acceptGroupInvite,
  declineGroupInvite,
  leaveGroup,
  updateMemberGroup,
  moveMember,

  // Member operations
  getMemberProfile,
  getMemberHistory,
  getRosterMemberSocialHistory,

  // Waiver wire
  getWaiverWire,
  addToWaiverWire,
  updateWaiverWire,
  removeFromWaiverWire,

  // Error class for external use
  RosterServiceError,

  // Constants
  VALID_SORT_OPTIONS,
};
