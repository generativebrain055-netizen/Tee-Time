/**
 * Roster Service
 * Business logic for roster operations
 * @module services/rosterService
 */

const rosterRepository = require("../repositories/rosterRepository");
const userRepository = require("../repositories/userRepository");
const rosterNotificationService = require("./rosterNotificationService");
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

/**
 * Get user's roster (non-on-deck entries)
 */
async function getRoster(userId, options = {}) {
  return rosterRepository.getRoster(userId, {
    sortBy: options.sortBy,
    isOnDeck: false,
  });
}

/**
 * Get user's on-deck roster entries
 */
async function getOnDeck(userId) {
  return rosterRepository.getOnDeck(userId);
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

  const entry = await rosterRepository.addToRoster(userId, {
    contactUserId,
    contactPhone,
    contactName,
    contactEmail,
  });

  // Side effect: Send notification (fire and forget)
  if (contactUserId) {
    sendAddToRosterNotification(userId, entry).catch((err) => {
      logger.error("Failed to send roster add notification:", err);
    });
  }

  return entry;
}

/**
 * Send notification when user is added to roster
 * @private
 */
async function sendAddToRosterNotification(userId, entry) {
  const user = await userRepository.findById(userId);
  await rosterNotificationService.sendRosterAddNotification(entry, user);
}

/**
 * Remove a contact from the user's roster
 * @throws {RosterServiceError} If entry not found
 */
async function removeFromRoster(userId, rosterId) {
  const removed = await rosterRepository.removeFromRoster(userId, rosterId);
  if (!removed) {
    throw new RosterServiceError("Roster entry not found", "NOT_FOUND", 404);
  }
  return removed;
}

/**
 * Reorder roster entries
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
  const updated = await rosterRepository.toggleOnDeck(
    userId,
    rosterId,
    isOnDeck,
  );
  if (!updated) {
    throw new RosterServiceError("Roster entry not found", "NOT_FOUND", 404);
  }
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
  const groups = await rosterRepository.getGroups(userId);
  const group = (groups || []).find((g) => g.id === groupId);

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
  const deleted = await rosterRepository.deleteGroup(userId, groupId);
  if (!deleted) {
    throw new RosterServiceError("Group not found", "NOT_FOUND", 404);
  }
  return deleted;
}

/**
 * Get members of a group
 * @throws {RosterServiceError} If access denied
 */
async function getGroupMembers(userId, groupId, sortBy) {
  // Check access first
  const groupCheck = await rosterRepository.getGroupWithAccess(userId, groupId);
  if (!groupCheck) {
    throw new RosterServiceError(
      "Access denied to this group",
      "ACCESS_DENIED",
      403,
    );
  }

  return rosterRepository.getGroupMembersForGroup(groupId, sortBy);
}

/**
 * Update which group a member belongs to
 * @throws {RosterServiceError} If roster entry not found
 */
async function updateMemberGroup(userId, rosterId, groupId) {
  const updated = groupId
    ? await rosterRepository.addToGroup(userId, rosterId, groupId)
    : await rosterRepository.removeFromGroup(userId, rosterId);

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
  const updated = await rosterRepository.moveMember(
    userId,
    rosterId,
    targetGroupId,
    isOnDeck,
    newPosition,
  );

  if (!updated) {
    throw new RosterServiceError("Roster entry not found", "NOT_FOUND", 404);
  }

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
  return profile;
}

/**
 * Get play history with a roster member
 */
async function getMemberHistory(userId, rosterId) {
  return rosterRepository.getMemberHistory(userId, rosterId);
}

// ============ WAIVER WIRE ============

/**
 * Get waiver wire entries for a specific date
 * @throws {RosterServiceError} If date is missing
 */
async function getWaiverWire(userId, date) {
  if (!date) {
    throw new RosterServiceError("Date is required", "MISSING_DATE");
  }
  return rosterRepository.getWaiverWire(date, userId);
}

/**
 * Add user to waiver wire for a date
 * @throws {RosterServiceError} If date is missing
 */
async function addToWaiverWire(userId, data) {
  if (!data.availableDate) {
    throw new RosterServiceError("Available date is required", "MISSING_DATE");
  }
  return rosterRepository.addToWaiverWire(userId, data);
}

/**
 * Remove user from waiver wire for a date
 */
async function removeFromWaiverWire(userId, date) {
  return rosterRepository.removeFromWaiverWire(userId, date);
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
  updateMemberGroup,
  moveMember,

  // Member operations
  getMemberProfile,
  getMemberHistory,

  // Waiver wire
  getWaiverWire,
  addToWaiverWire,
  removeFromWaiverWire,

  // Error class for external use
  RosterServiceError,

  // Constants
  VALID_SORT_OPTIONS,
};
