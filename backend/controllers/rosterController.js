/**
 * Roster Controller
 * Thin HTTP layer - delegates all business logic to rosterService
 * @module controllers/rosterController
 */

const rosterService = require('../services/rosterService');
const formatter = require('../formatters/rosterFormatter');
const logger = require('../config/logger');
const { formatDateLocal } = require('../utils/dateUtils');

/**
 * Standard success response
 */
const success = (res, data, statusCode = 200) => {
  res.status(statusCode).json({ success: true, ...data });
};

/**
 * Standard error response
 */
const error = (res, message, statusCode = 500, code = null) => {
  const response = { success: false, message };
  if (code) response.code = code;
  res.status(statusCode).json(response);
};

/**
 * Handle service errors with appropriate HTTP status codes
 */
const handleServiceError = (res, err, fallbackMessage) => {
  if (err.name === 'RosterServiceError') {
    return error(res, err.message, err.statusCode, err.code);
  }
  logger.error(`${fallbackMessage}:`, err);
  return error(res, fallbackMessage);
};

class RosterController {
  // GET /api/roster
  async getRoster(req, res) {
    try {
      const roster = await rosterService.getRoster(req.user.id, { sortBy: req.query.sortBy });
      success(res, { roster: formatter.formatRosterEntries(roster) });
    } catch (err) {
      logger.error('Get roster error:', err);
      success(res, { roster: [] }); // Graceful degradation
    }
  }

  // GET /api/roster/on-deck
  async getOnDeck(req, res) {
    try {
      const onDeck = await rosterService.getOnDeck(req.user.id);
      const formatted = (onDeck || []).map(formatter.formatOnDeckEntry);
      success(res, { onDeck: formatted });
    } catch (err) {
      logger.error('Get on-deck error:', err);
      success(res, { onDeck: [] });
    }
  }

  // POST /api/roster
  async addToRoster(req, res) {
    try {
      const entry = await rosterService.addToRoster(req.user.id, req.body);
      success(res, { entry }, 201);
    } catch (err) {
      handleServiceError(res, err, 'Failed to add to roster');
    }
  }

  // DELETE /api/roster/:id
  async removeFromRoster(req, res) {
    try {
      await rosterService.removeFromRoster(req.user.id, req.params.id);
      success(res, { message: 'Removed from roster' });
    } catch (err) {
      handleServiceError(res, err, 'Failed to remove from roster');
    }
  }

  // PUT /api/roster/reorder
  async reorderRoster(req, res) {
    try {
      await rosterService.reorderRoster(req.user.id, req.body.orderedIds);
      success(res, { message: 'Roster reordered' });
    } catch (err) {
      handleServiceError(res, err, 'Failed to reorder roster');
    }
  }

  // PUT /api/roster/:id/on-deck
  async toggleOnDeck(req, res) {
    try {
      const entry = await rosterService.toggleOnDeck(req.user.id, req.params.id, req.body.isOnDeck);
      success(res, { entry });
    } catch (err) {
      handleServiceError(res, err, 'Failed to update on-deck status');
    }
  }

  // GET /api/roster/search?q=query
  async searchUsers(req, res) {
    try {
      if (!req.user?.id) {
        return error(res, 'Unauthorized', 401);
      }
      const users = await rosterService.searchUsers(req.query.q, req.user.id);
      const formatted = (users || []).map((u) => formatter.formatUserSearchResult(u));
      success(res, { users: formatted });
    } catch (err) {
      handleServiceError(res, err, 'Failed to search users');
    }
  }

  // ============ GROUPS ============

  // GET /api/roster/groups
  async getGroups(req, res) {
    try {
      const groups = await rosterService.getGroups(req.user.id);
      success(res, { groups: formatter.formatGroups(groups) });
    } catch (err) {
      logger.error('Get groups error:', err);
      success(res, { groups: [] });
    }
  }

  // GET /api/roster/groups/:id
  async getGroup(req, res) {
    try {
      const group = await rosterService.getGroup(req.user.id, req.params.id);
      success(res, { group: formatter.formatGroup(group) });
    } catch (err) {
      handleServiceError(res, err, 'Failed to get group');
    }
  }

  // POST /api/roster/groups
  async createGroup(req, res) {
    try {
      const { group, memberCount } = await rosterService.createGroup(req.user.id, req.body);
      const formatted = {
        ...formatter.formatGroup(group),
        memberCount,
        onDeckCount: 0
      };
      success(res, { group: formatted }, 201);
    } catch (err) {
      handleServiceError(res, err, 'Failed to create group');
    }
  }

  // PUT /api/roster/groups/:id
  async updateGroup(req, res) {
    try {
      const group = await rosterService.updateGroup(req.user.id, req.params.id, req.body);
      success(res, { group: formatter.formatGroup(group) });
    } catch (err) {
      handleServiceError(res, err, 'Failed to update group');
    }
  }

  // PUT /api/roster/groups/:id/sort
  async updateGroupSort(req, res) {
    try {
      const group = await rosterService.updateGroupSort(req.user.id, req.params.id, req.body.sortBy);
      success(res, { sortPreference: group.sort_preference });
    } catch (err) {
      handleServiceError(res, err, 'Failed to update sort preference');
    }
  }

  // GET /api/roster/groups/:id/auto-invite
  async getAutoInviteMembers(req, res) {
    try {
      const members = await rosterService.getAutoInviteMembers(req.user.id, req.params.id);
      const formatted = members.map(formatter.formatAutoInviteMember);
      success(res, { members: formatted, count: formatted.length });
    } catch (err) {
      handleServiceError(res, err, 'Failed to get auto-invite members');
    }
  }

  // DELETE /api/roster/groups/:id
  async deleteGroup(req, res) {
    try {
      await rosterService.deleteGroup(req.user.id, req.params.id);
      success(res, { message: 'Group deleted' });
    } catch (err) {
      handleServiceError(res, err, 'Failed to delete group');
    }
  }

  // GET /api/roster/groups/:id/members
  async getGroupMembers(req, res) {
    try {
      const members = await rosterService.getGroupMembers(req.user.id, req.params.id, req.query.sortBy);
      success(res, { members: formatter.formatRosterEntries(members || []) });
    } catch (err) {
      if (err.code === 'ACCESS_DENIED') {
        return error(res, err.message, 403);
      }
      logger.error('Get group members error:', err);
      success(res, { members: [] });
    }
  }

  // POST /api/roster/groups/:id/members (Figma 1075-927: Inviting people to group)
  async addMembersToGroup(req, res) {
    try {
      const { memberUserIds } = req.body;
      if (!Array.isArray(memberUserIds) || memberUserIds.length === 0) {
        return error(res, "memberUserIds must be a non-empty array", 400);
      }
      const result = await rosterService.addMembersToGroup(req.user.id, req.params.id, memberUserIds);
      success(res, result);
    } catch (err) {
      handleServiceError(res, err, 'Failed to add members to group');
    }
  }

  // POST /api/roster/groups/:id/invite (Figma 1269-977: send group invite notifications; invitees accept/decline)
  async inviteToGroup(req, res) {
    try {
      const { memberUserIds } = req.body;
      if (!Array.isArray(memberUserIds) || memberUserIds.length === 0) {
        return error(res, "memberUserIds must be a non-empty array", 400);
      }
      const result = await rosterService.inviteToGroup(req.user.id, req.params.id, memberUserIds);
      success(res, result);
    } catch (err) {
      handleServiceError(res, err, 'Failed to send group invitations');
    }
  }

  // POST /api/roster/groups/accept-invite (accept group invitation from notification)
  async acceptGroupInvite(req, res) {
    try {
      const { notificationId } = req.body;
      if (!notificationId) {
        return error(res, "notificationId is required", 400);
      }
      const result = await rosterService.acceptGroupInvite(req.user.id, notificationId);
      success(res, result);
    } catch (err) {
      handleServiceError(res, err, 'Failed to accept group invitation');
    }
  }

  // POST /api/roster/groups/decline-invite
  async declineGroupInvite(req, res) {
    try {
      const { notificationId } = req.body;
      if (!notificationId) {
        return error(res, "notificationId is required", 400);
      }
      const result = await rosterService.declineGroupInvite(req.user.id, notificationId);
      success(res, result);
    } catch (err) {
      handleServiceError(res, err, 'Failed to decline group invitation');
    }
  }

  // POST /api/roster/groups/:id/leave (Figma 1075-927: removing yourself)
  async leaveGroup(req, res) {
    try {
      const result = await rosterService.leaveGroup(req.user.id, req.params.id);
      success(res, result);
    } catch (err) {
      handleServiceError(res, err, 'Failed to leave group');
    }
  }

  // PUT /api/roster/:id/group
  async updateMemberGroup(req, res) {
    try {
      const entry = await rosterService.updateMemberGroup(req.user.id, req.params.id, req.body.groupId);
      success(res, { entry });
    } catch (err) {
      handleServiceError(res, err, 'Failed to update member group');
    }
  }

  // PUT /api/roster/:id/move
  async moveMember(req, res) {
    try {
      const { targetGroupId, isOnDeck, newPosition } = req.body;
      const entry = await rosterService.moveMember(req.user.id, req.params.id, targetGroupId, isOnDeck, newPosition);
      success(res, { entry });
    } catch (err) {
      handleServiceError(res, err, 'Failed to move member');
    }
  }

  // GET /api/roster/:id/profile
  async getMemberProfile(req, res) {
    try {
      const profile = await rosterService.getMemberProfile(req.user.id, req.params.id);
      success(res, { profile: formatter.formatMemberProfile(profile) });
    } catch (err) {
      handleServiceError(res, err, 'Failed to get member profile');
    }
  }

  // GET /api/roster/:id/history
  async getMemberHistory(req, res) {
    try {
      const history = await rosterService.getMemberHistory(req.user.id, req.params.id);
      const formatted = history.map(h => ({
        id: h.id,
        teeTimeId: h.tee_time_id,
        courseName: h.course_name,
        teeDate: formatDateLocal(h.tee_date),
        teeTime: h.tee_time,
        inviteStatus: h.invite_status,
        playedTogether: h.played_together,
        teeTimeStatus: h.tee_time_status,
        createdAt: h.created_at
      }));
      success(res, { history: formatted });
    } catch (err) {
      handleServiceError(res, err, 'Failed to get member history');
    }
  }

  // ============ WAIVER WIRE ============

  // GET /api/roster/waiver-wire?date=YYYY-MM-DD&rosterConnectionsOnly=true&maxDistance=20&lat=...&lng=...
  async getWaiverWire(req, res) {
    try {
      const options = {
        rosterConnectionsOnly: req.query.rosterConnectionsOnly === 'true',
        maxDistance: req.query.maxDistance ? parseFloat(req.query.maxDistance) : null,
        userLat: req.query.lat ? parseFloat(req.query.lat) : null,
        userLng: req.query.lng ? parseFloat(req.query.lng) : null,
      };
      const entries = await rosterService.getWaiverWire(req.user.id, req.query.date, options);
      const formatted = entries.map(formatter.formatWaiverWireEntry);
      success(res, { waiverWire: formatted });
    } catch (err) {
      handleServiceError(res, err, 'Failed to get waiver wire');
    }
  }

  // POST /api/roster/waiver-wire
  async addToWaiverWire(req, res) {
    try {
      const entry = await rosterService.addToWaiverWire(req.user.id, req.body);
      success(res, { entry }, 201);
    } catch (err) {
      handleServiceError(res, err, 'Failed to add to waiver wire');
    }
  }

  // PUT /api/roster/waiver-wire/:date
  async updateWaiverWire(req, res) {
    try {
      const entry = await rosterService.updateWaiverWire(req.user.id, req.params.date, req.body);
      const formatted = formatter.formatWaiverWireEntry(entry);
      success(res, { entry: formatted });
    } catch (err) {
      handleServiceError(res, err, 'Failed to update waiver wire');
    }
  }

  // DELETE /api/roster/waiver-wire/:date
  async removeFromWaiverWire(req, res) {
    try {
      await rosterService.removeFromWaiverWire(req.user.id, req.params.date);
      success(res, { message: 'Removed from waiver wire' });
    } catch (err) {
      handleServiceError(res, err, 'Failed to remove from waiver wire');
    }
  }
}

// Export singleton with bound methods
const controller = new RosterController();
module.exports = {
  getRoster: controller.getRoster.bind(controller),
  getOnDeck: controller.getOnDeck.bind(controller),
  addToRoster: controller.addToRoster.bind(controller),
  removeFromRoster: controller.removeFromRoster.bind(controller),
  reorderRoster: controller.reorderRoster.bind(controller),
  toggleOnDeck: controller.toggleOnDeck.bind(controller),
  searchUsers: controller.searchUsers.bind(controller),
  getGroups: controller.getGroups.bind(controller),
  getGroup: controller.getGroup.bind(controller),
  createGroup: controller.createGroup.bind(controller),
  updateGroup: controller.updateGroup.bind(controller),
  updateGroupSort: controller.updateGroupSort.bind(controller),
  getAutoInviteMembers: controller.getAutoInviteMembers.bind(controller),
  deleteGroup: controller.deleteGroup.bind(controller),
  getGroupMembers: controller.getGroupMembers.bind(controller),
  addMembersToGroup: controller.addMembersToGroup.bind(controller),
  inviteToGroup: controller.inviteToGroup.bind(controller),
  acceptGroupInvite: controller.acceptGroupInvite.bind(controller),
  declineGroupInvite: controller.declineGroupInvite.bind(controller),
  leaveGroup: controller.leaveGroup.bind(controller),
  updateMemberGroup: controller.updateMemberGroup.bind(controller),
  moveMember: controller.moveMember.bind(controller),
  getMemberProfile: controller.getMemberProfile.bind(controller),
  getMemberHistory: controller.getMemberHistory.bind(controller),
  getWaiverWire: controller.getWaiverWire.bind(controller),
  addToWaiverWire: controller.addToWaiverWire.bind(controller),
  updateWaiverWire: controller.updateWaiverWire.bind(controller),
  removeFromWaiverWire: controller.removeFromWaiverWire.bind(controller)
};
