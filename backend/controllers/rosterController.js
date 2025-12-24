const rosterRepository = require("../repositories/rosterRepository");
const userRepository = require("../repositories/userRepository");
const rosterNotificationService = require("../services/rosterNotificationService");
const logger = require("../config/logger");
const { formatDateLocal } = require("../utils/dateUtils");

class RosterController {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.getRoster = this.getRoster.bind(this);
    this.getOnDeck = this.getOnDeck.bind(this);
    this.addToRoster = this.addToRoster.bind(this);
    this.removeFromRoster = this.removeFromRoster.bind(this);
    this.reorderRoster = this.reorderRoster.bind(this);
    this.toggleOnDeck = this.toggleOnDeck.bind(this);
    this.searchUsers = this.searchUsers.bind(this);
    this.getGroups = this.getGroups.bind(this);
    this.getGroup = this.getGroup.bind(this);
    this.createGroup = this.createGroup.bind(this);
    this.updateGroup = this.updateGroup.bind(this);
    this.updateGroupSort = this.updateGroupSort.bind(this);
    this.getAutoInviteMembers = this.getAutoInviteMembers.bind(this);
    this.deleteGroup = this.deleteGroup.bind(this);
    this.getGroupMembers = this.getGroupMembers.bind(this);
    this.updateMemberGroup = this.updateMemberGroup.bind(this);
    this.moveMember = this.moveMember.bind(this);
    this.getMemberProfile = this.getMemberProfile.bind(this);
    this.getMemberHistory = this.getMemberHistory.bind(this);
    this.getWaiverWire = this.getWaiverWire.bind(this);
    this.addToWaiverWire = this.addToWaiverWire.bind(this);
    this.removeFromWaiverWire = this.removeFromWaiverWire.bind(this);
    this.formatRosterEntries = this.formatRosterEntries.bind(this);
  }

  // GET /api/roster
  async getRoster(req, res) {
    try {
      const userId = req.user.id;
      const { sortBy } = req.query;
      const roster = await rosterRepository.getRoster(userId, { sortBy });
      
      const formattedRoster = (roster || []).map((r, index) => ({
        id: r.id,
        position: r.position,
        isOnDeck: r.is_on_deck,
        contact: {
          userId: r.contact_user_id,
          phone: r.contact_phone,
          name: r.contact_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown',
          email: r.contact_email,
          avatar: r.avatar_url,
          handicap: r.contact_handicap || r.user_handicap,
          username: r.username,
          socialRate: r.profile_social_rate || r.social_rate
        },
        distanceToCourse: r.distance_to_course,
        membership: r.club_membership,
        notes: r.notes,
        createdAt: r.created_at
      }));

      res.json({ success: true, roster: formattedRoster });
    } catch (error) {
      logger.error("Get roster error:", error);
      // Return empty roster on error (table might not exist yet)
      res.json({ success: true, roster: [] });
    }
  }

  // GET /api/roster/on-deck
  async getOnDeck(req, res) {
    try {
      const userId = req.user.id;
      const onDeck = await rosterRepository.getOnDeck(userId);
      
      const formatted = (onDeck || []).map(r => ({
        id: r.id,
        position: r.position,
        contact: {
          userId: r.contact_user_id,
          phone: r.contact_phone,
          name: r.contact_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown',
          avatar: r.avatar_url,
          handicap: r.contact_handicap || r.user_handicap,
          socialRate: r.profile_social_rate || r.social_rate
        },
        distanceToCourse: r.distance_to_course,
        membership: r.club_membership
      }));

      res.json({ success: true, onDeck: formatted });
    } catch (error) {
      logger.error("Get on-deck error:", error);
      // Return empty on-deck on error (table might not exist yet)
      res.json({ success: true, onDeck: [] });
    }
  }

  // POST /api/roster
  async addToRoster(req, res) {
    try {
      const userId = req.user.id;
      const { contactUserId, contactPhone, contactName, contactEmail } = req.body;

      // Check if already in roster
      const exists = await rosterRepository.isInRoster(userId, contactUserId, contactPhone);
      if (exists) {
        return res.status(400).json({ success: false, message: "Contact already in roster" });
      }

      const entry = await rosterRepository.addToRoster(userId, {
        contactUserId, contactPhone, contactName, contactEmail
      });

      // Send notification to the added user (async, don't block response)
      if (contactUserId) {
        const user = await userRepository.findById(userId);
        rosterNotificationService.sendRosterAddNotification(entry, user).catch(err => {
          logger.error("Failed to send roster notification:", err);
        });
      }

      res.status(201).json({ success: true, entry });
    } catch (error) {
      logger.error("Add to roster error:", error);
      res.status(500).json({ success: false, message: "Failed to add to roster" });
    }
  }

  // DELETE /api/roster/:id
  async removeFromRoster(req, res) {
    try {
      const userId = req.user.id;
      const rosterId = req.params.id;

      const removed = await rosterRepository.removeFromRoster(userId, rosterId);
      if (!removed) {
        return res.status(404).json({ success: false, message: "Roster entry not found" });
      }

      res.json({ success: true, message: "Removed from roster" });
    } catch (error) {
      logger.error("Remove from roster error:", error);
      res.status(500).json({ success: false, message: "Failed to remove from roster" });
    }
  }

  // PUT /api/roster/reorder
  async reorderRoster(req, res) {
    try {
      const userId = req.user.id;
      const { orderedIds } = req.body;

      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, message: "orderedIds must be an array" });
      }

      await rosterRepository.reorderRoster(userId, orderedIds);
      res.json({ success: true, message: "Roster reordered" });
    } catch (error) {
      logger.error("Reorder roster error:", error);
      res.status(500).json({ success: false, message: "Failed to reorder roster" });
    }
  }

  // PUT /api/roster/:id/on-deck
  async toggleOnDeck(req, res) {
    try {
      const userId = req.user.id;
      const rosterId = req.params.id;
      const { isOnDeck } = req.body;

      const updated = await rosterRepository.toggleOnDeck(userId, rosterId, isOnDeck);
      if (!updated) {
        return res.status(404).json({ success: false, message: "Roster entry not found" });
      }

      res.json({ success: true, entry: updated });
    } catch (error) {
      logger.error("Toggle on-deck error:", error);
      res.status(500).json({ success: false, message: "Failed to update on-deck status" });
    }
  }

  // GET /api/roster/search?q=query
  async searchUsers(req, res) {
    try {
      const userId = req.user.id;
      const query = req.query.q;

      if (!query || query.length < 2) {
        return res.json({ success: true, users: [] });
      }

      const users = await rosterRepository.searchUsers(query, userId);
      
      const formatted = users.map(u => ({
        id: u.id,
        phone: u.phone_number,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        username: u.username,
        avatar: u.avatar_url,
        handicap: u.handicap
      }));

      res.json({ success: true, users: formatted });
    } catch (error) {
      logger.error("Search users error:", error);
      res.status(500).json({ success: false, message: "Failed to search users" });
    }
  }

  // ============ ROSTER GROUPS ============

  // GET /api/roster/groups
  async getGroups(req, res) {
    try {
      const userId = req.user.id;
      const groups = await rosterRepository.getGroups(userId);
      
      const formatted = (groups || []).map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        color: g.color,
        icon: g.icon,
        position: g.position,
        memberCount: parseInt(g.member_count) || 0,
        onDeckCount: parseInt(g.on_deck_count) || 0,
        autoInvite: g.auto_invite,
        maxMembers: g.max_members,
        isDefault: g.is_default,
        isOwner: g.is_owner,
        ownerId: g.user_id
      }));

      res.json({ success: true, groups: formatted });
    } catch (error) {
      logger.error("Get groups error:", error);
      // Return empty groups on error (table might not exist yet)
      res.json({ success: true, groups: [] });
    }
  }

  // GET /api/roster/groups/:id
  async getGroup(req, res) {
    try {
      const userId = req.user.id;
      const groupId = req.params.id;
      
      const groups = await rosterRepository.getGroups(userId);
      const group = (groups || []).find(g => g.id === groupId);
      
      if (!group) {
        return res.status(404).json({ success: false, message: "Group not found" });
      }

      const formatted = {
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        icon: group.icon,
        position: group.position,
        memberCount: parseInt(group.member_count) || 0,
        onDeckCount: parseInt(group.on_deck_count) || 0,
        autoInvite: group.auto_invite,
        maxMembers: group.max_members,
        isDefault: group.is_default,
        isOwner: group.is_owner,
        ownerId: group.user_id
      };

      res.json({ success: true, group: formatted });
    } catch (error) {
      logger.error("Get group error:", error);
      res.status(500).json({ success: false, message: "Failed to get group" });
    }
  }

  // POST /api/roster/groups
  async createGroup(req, res) {
    try {
      const userId = req.user.id;
      const { name, description, color, icon, autoInvite, maxMembers, memberIds } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: "Group name is required" });
      }

      const group = await rosterRepository.createGroup(userId, {
        name, description, color, icon, autoInvite, maxMembers
      });

      // Add members to the group if provided
      let memberCount = 0;
      if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
        memberCount = await rosterRepository.addMembersToGroup(userId, group.id, memberIds);
      }

      // Format the response to match frontend expectations
      const formatted = {
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        icon: group.icon,
        position: group.position,
        memberCount: memberCount,
        onDeckCount: 0,
        autoInvite: group.auto_invite,
        maxMembers: group.max_members,
        isDefault: group.is_default,
        sortPreference: group.sort_preference || 'position'
      };

      res.status(201).json({ success: true, group: formatted });
    } catch (error) {
      logger.error("Create group error:", error);
      if (error.code === "DUPLICATE_NAME") {
        return res.status(400).json({ success: false, message: error.message, code: "DUPLICATE_NAME" });
      }
      res.status(500).json({ success: false, message: "Failed to create group" });
    }
  }

  // PUT /api/roster/groups/:id
  async updateGroup(req, res) {
    try {
      const userId = req.user.id;
      const groupId = req.params.id;
      const data = req.body;

      const group = await rosterRepository.updateGroup(userId, groupId, data);
      if (!group) {
        return res.status(404).json({ success: false, message: "Group not found" });
      }

      // Format the response to match frontend expectations
      const formatted = {
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        icon: group.icon,
        position: group.position,
        memberCount: parseInt(group.member_count) || 0,
        onDeckCount: parseInt(group.on_deck_count) || 0,
        autoInvite: group.auto_invite,
        maxMembers: group.max_members,
        isDefault: group.is_default,
        sortPreference: group.sort_preference || 'position'
      };

      res.json({ success: true, group: formatted });
    } catch (error) {
      logger.error("Update group error:", error);
      if (error.code === "DUPLICATE_NAME") {
        return res.status(400).json({ success: false, message: error.message, code: "DUPLICATE_NAME" });
      }
      res.status(500).json({ success: false, message: "Failed to update group" });
    }
  }

  // PUT /api/roster/groups/:id/sort
  async updateGroupSort(req, res) {
    try {
      const userId = req.user.id;
      const groupId = req.params.id;
      const { sortBy } = req.body;

      const validSorts = ['position', 'socialRate', 'handicap', 'name', 'distance', 'membership'];
      if (!validSorts.includes(sortBy)) {
        return res.status(400).json({ success: false, message: "Invalid sort option" });
      }

      const group = await rosterRepository.updateGroupSortPreference(userId, groupId, sortBy);
      if (!group) {
        return res.status(404).json({ success: false, message: "Group not found" });
      }

      res.json({ success: true, sortPreference: group.sort_preference });
    } catch (error) {
      logger.error("Update group sort error:", error);
      res.status(500).json({ success: false, message: "Failed to update sort preference" });
    }
  }

  // GET /api/roster/groups/:id/auto-invite
  async getAutoInviteMembers(req, res) {
    try {
      const userId = req.user.id;
      const groupId = req.params.id;

      const members = await rosterRepository.getAutoInviteMembers(userId, groupId);
      const formatted = members.map(m => ({
        id: m.id,
        userId: m.contact_user_id,
        phone: m.contact_phone || m.phone_number,
        name: m.contact_name || `${m.first_name || ''} ${m.last_name || ''}`.trim(),
        avatar: m.avatar_url,
        handicap: m.contact_handicap || m.user_handicap,
        socialRate: m.social_rate
      }));

      res.json({ success: true, members: formatted, count: formatted.length });
    } catch (error) {
      logger.error("Get auto-invite members error:", error);
      res.status(500).json({ success: false, message: "Failed to get auto-invite members" });
    }
  }

  // DELETE /api/roster/groups/:id
  async deleteGroup(req, res) {
    try {
      const userId = req.user.id;
      const groupId = req.params.id;

      const deleted = await rosterRepository.deleteGroup(userId, groupId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Group not found" });
      }

      res.json({ success: true, message: "Group deleted" });
    } catch (error) {
      logger.error("Delete group error:", error);
      res.status(500).json({ success: false, message: "Failed to delete group" });
    }
  }

  // GET /api/roster/groups/:id/members
  async getGroupMembers(req, res) {
    try {
      const userId = req.user.id;
      const groupId = req.params.id;
      const { sortBy } = req.query;

      // First check if user has access to this group (owner or member)
      const groupCheck = await rosterRepository.getGroupWithAccess(userId, groupId);
      if (!groupCheck) {
        return res.status(403).json({ success: false, message: "Access denied to this group" });
      }

      // Get members - use the group owner's roster to get members
      const members = await rosterRepository.getGroupMembersForGroup(groupId, sortBy);
      const formatted = this.formatRosterEntries(members || []);

      res.json({ success: true, members: formatted });
    } catch (error) {
      logger.error("Get group members error:", error);
      // Return empty members on error
      res.json({ success: true, members: [] });
    }
  }

  // PUT /api/roster/:id/group
  async updateMemberGroup(req, res) {
    try {
      const userId = req.user.id;
      const rosterId = req.params.id;
      const { groupId } = req.body;

      const updated = groupId 
        ? await rosterRepository.addToGroup(userId, rosterId, groupId)
        : await rosterRepository.removeFromGroup(userId, rosterId);

      if (!updated) {
        return res.status(404).json({ success: false, message: "Roster entry not found" });
      }

      res.json({ success: true, entry: updated });
    } catch (error) {
      logger.error("Update member group error:", error);
      res.status(500).json({ success: false, message: "Failed to update member group" });
    }
  }

  // PUT /api/roster/:id/move
  async moveMember(req, res) {
    try {
      const userId = req.user.id;
      const rosterId = req.params.id;
      const { targetGroupId, isOnDeck, newPosition } = req.body;

      const updated = await rosterRepository.moveMember(
        userId, rosterId, targetGroupId, isOnDeck, newPosition
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: "Roster entry not found" });
      }

      res.json({ success: true, entry: updated });
    } catch (error) {
      logger.error("Move member error:", error);
      res.status(500).json({ success: false, message: "Failed to move member" });
    }
  }

  // GET /api/roster/:id/profile
  async getMemberProfile(req, res) {
    try {
      const userId = req.user.id;
      const rosterId = req.params.id;

      const profile = await rosterRepository.getMemberProfile(userId, rosterId);
      if (!profile) {
        return res.status(404).json({ success: false, message: "Member not found" });
      }

      const formatted = {
        id: profile.id || rosterId,
        position: profile.position,
        isOnDeck: profile.is_on_deck,
        groupId: profile.group_id,
        groupName: profile.group_name,
        groupColor: profile.group_color,
        contact: {
          userId: profile.contact_user_id,
          phone: profile.contact_phone || profile.phone_number,
          name: profile.contact_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
          email: profile.contact_email,
          username: profile.username,
          avatar: profile.avatar_url,
          bio: profile.bio
        },
        stats: {
          handicap: profile.contact_handicap || profile.handicap,
          socialRate: profile.social_rate || profile.profile_social_rate,
          roundsPlayed: profile.rounds_played,
          averageScore: profile.average_score,
          timesPlayedTogether: profile.times_played || profile.times_played_together || 0,
          invitesAccepted: profile.invites_accepted || 0,
          totalInvites: profile.total_invites || 0,
          acceptanceRate: (profile.total_invites || 0) > 0 
            ? (((profile.invites_accepted || 0) / profile.total_invites) * 100).toFixed(0) + '%'
            : 'N/A',
          lastPlayedTogether: profile.last_played_together
        },
        preferences: {
          location: profile.location,
          homeCourse: profile.home_course,
          preferredTeeTime: profile.preferred_tee_time,
          walkOrRide: profile.walk_or_ride,
          playingPartnerPreference: profile.playing_partner_preference
        },
        equipment: {
          driver: profile.driver,
          irons: profile.irons,
          putter: profile.putter,
          ball: profile.ball
        },
        membership: profile.club_membership,
        distanceToCourse: profile.distance_to_course,
        notes: profile.notes
      };

      res.json({ success: true, profile: formatted });
    } catch (error) {
      logger.error("Get member profile error:", error);
      res.status(500).json({ success: false, message: "Failed to get member profile" });
    }
  }

  // GET /api/roster/:id/history
  async getMemberHistory(req, res) {
    try {
      const userId = req.user.id;
      const rosterId = req.params.id;

      const history = await rosterRepository.getMemberHistory(userId, rosterId);
      
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

      res.json({ success: true, history: formatted });
    } catch (error) {
      logger.error("Get member history error:", error);
      res.status(500).json({ success: false, message: "Failed to get member history" });
    }
  }

  // ============ WAIVER WIRE ============

  // GET /api/roster/waiver-wire?date=YYYY-MM-DD
  async getWaiverWire(req, res) {
    try {
      const userId = req.user.id;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ success: false, message: "Date is required" });
      }

      const entries = await rosterRepository.getWaiverWire(date, userId);
      
      const formatted = entries.map(e => ({
        id: e.id,
        user: {
          id: e.user_id,
          name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
          username: e.username,
          avatar: e.avatar_url,
          handicap: e.handicap,
          socialRate: e.social_rate,
          location: e.location,
          homeCourse: e.home_course
        },
        availableDate: e.available_date,
        preferredTime: e.preferred_time,
        preferredCourse: e.preferred_course,
        maxHandicap: e.max_handicap,
        notes: e.notes
      }));

      res.json({ success: true, waiverWire: formatted });
    } catch (error) {
      logger.error("Get waiver wire error:", error);
      res.status(500).json({ success: false, message: "Failed to get waiver wire" });
    }
  }

  // POST /api/roster/waiver-wire
  async addToWaiverWire(req, res) {
    try {
      const userId = req.user.id;
      const data = req.body;

      if (!data.availableDate) {
        return res.status(400).json({ success: false, message: "Available date is required" });
      }

      const entry = await rosterRepository.addToWaiverWire(userId, data);
      res.status(201).json({ success: true, entry });
    } catch (error) {
      logger.error("Add to waiver wire error:", error);
      res.status(500).json({ success: false, message: "Failed to add to waiver wire" });
    }
  }

  // DELETE /api/roster/waiver-wire/:date
  async removeFromWaiverWire(req, res) {
    try {
      const userId = req.user.id;
      const { date } = req.params;

      await rosterRepository.removeFromWaiverWire(userId, date);
      res.json({ success: true, message: "Removed from waiver wire" });
    } catch (error) {
      logger.error("Remove from waiver wire error:", error);
      res.status(500).json({ success: false, message: "Failed to remove from waiver wire" });
    }
  }

  // Helper to format roster entries
  formatRosterEntries(roster) {
    return roster.map((r, index) => ({
      id: r.id,
      position: r.position,
      isOnDeck: r.is_on_deck,
      groupId: r.group_id,
      groupName: r.group_name,
      groupColor: r.group_color,
      contact: {
        userId: r.contact_user_id,
        phone: r.contact_phone,
        name: r.contact_name || `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        email: r.contact_email,
        avatar: r.avatar_url,
        handicap: r.contact_handicap || r.user_handicap,
        username: r.username,
        socialRate: r.social_rate || r.profile_social_rate,
        location: r.location,
        homeCourse: r.home_course
      },
      stats: {
        timesPlayedTogether: r.times_played_together,
        lastPlayedTogether: r.last_played_together,
        acceptanceRate: r.invite_acceptance_rate
      },
      membership: r.club_membership,
      distanceToCourse: r.distance_to_course,
      notes: r.notes,
      createdAt: r.created_at
    }));
  }
}

module.exports = new RosterController();
