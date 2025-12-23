const teeTimeRepository = require("../repositories/teeTimeRepository");
const inviteRepository = require("../repositories/inviteRepository");
const rosterRepository = require("../repositories/rosterRepository");
const inviteManagementService = require("../services/inviteManagementService");
const logger = require("../config/logger");
const { formatDateLocal } = require("../utils/dateUtils");

class TeeTimeController {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.createTeeTime = this.createTeeTime.bind(this);
    this.getTeeTimes = this.getTeeTimes.bind(this);
    this.getUpcoming = this.getUpcoming.bind(this);
    this.getTeeTime = this.getTeeTime.bind(this);
    this.cancelTeeTime = this.cancelTeeTime.bind(this);
    this.getCalendar = this.getCalendar.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.skipInvite = this.skipInvite.bind(this);
    this.sendOnDeckInvites = this.sendOnDeckInvites.bind(this);
    this.setFCFSDeadline = this.setFCFSDeadline.bind(this);
  }

  // POST /api/tee-times
  async createTeeTime(req, res) {
    try {
      const userId = req.user.id;
      const { courseName, courseLocation, teeDate, teeTime, maxPlayers, inviteType, notes } = req.body;

      // Validate tee time is not in the past
      const now = new Date();
      const teeDateTime = new Date(`${teeDate}T${teeTime}`);
      
      if (teeDateTime < now) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot create a tee time in the past" 
        });
      }

      const teeTimeData = await teeTimeRepository.createTeeTime(userId, {
        courseName, courseLocation, teeDate, teeTime, maxPlayers, inviteType, notes
      });

      // Format the response to ensure date is returned correctly
      const formattedTeeTime = {
        id: teeTimeData.id,
        courseName: teeTimeData.course_name,
        courseLocation: teeTimeData.course_location,
        teeDate: formatDateLocal(teeTimeData.tee_date),
        teeTime: teeTimeData.tee_time,
        maxPlayers: teeTimeData.max_players,
        inviteType: teeTimeData.invite_type,
        status: teeTimeData.status,
        notes: teeTimeData.notes,
        createdAt: teeTimeData.created_at
      };

      res.status(201).json({ success: true, teeTime: formattedTeeTime });
    } catch (error) {
      logger.error("Create tee time error:", error);
      res.status(500).json({ success: false, message: "Failed to create tee time" });
    }
  }

  // GET /api/tee-times
  async getTeeTimes(req, res) {
    try {
      const userId = req.user.id;
      const { status } = req.query;

      // Update past tee times to completed status
      await teeTimeRepository.markPastTeeTimesCompleted();

      const teeTimes = await teeTimeRepository.getUserTeeTimes(userId, status);
      
      const formatted = teeTimes.map(t => ({
        id: t.id,
        courseName: t.course_name,
        courseLocation: t.course_location,
        teeDate: formatDateLocal(t.tee_date),
        teeTime: t.tee_time,
        maxPlayers: t.max_players,
        inviteType: t.invite_type,
        status: t.status,
        participantCount: parseInt(t.participant_count),
        creator: {
          firstName: t.creator_first_name,
          lastName: t.creator_last_name
        },
        notes: t.notes,
        createdAt: t.created_at
      }));

      res.json({ success: true, teeTimes: formatted });
    } catch (error) {
      logger.error("Get tee times error:", error);
      res.status(500).json({ success: false, message: "Failed to get tee times" });
    }
  }

  // GET /api/tee-times/upcoming
  async getUpcoming(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;

      // Update past tee times to completed status
      await teeTimeRepository.markPastTeeTimesCompleted();

      const teeTimes = await teeTimeRepository.getUpcomingTeeTimes(userId, limit);
      
      // Get participants for each tee time
      const formatted = await Promise.all(teeTimes.map(async (t) => {
        const participants = await teeTimeRepository.getParticipants(t.id);
        return {
          id: t.id,
          courseName: t.course_name,
          courseLocation: t.course_location,
          teeDate: formatDateLocal(t.tee_date),
          teeTime: t.tee_time,
          maxPlayers: t.max_players,
          inviteType: t.invite_type,
          status: t.status,
          participantCount: parseInt(t.participant_count),
          creator: {
            firstName: t.creator_first_name,
            lastName: t.creator_last_name
          },
          participants: participants.map(p => ({
            id: p.id,
            userId: p.user_id,
            name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            avatar: p.avatar_url,
            isCreator: p.is_creator
          }))
        };
      }));

      res.json({ success: true, teeTimes: formatted });
    } catch (error) {
      logger.error("Get upcoming tee times error:", error);
      res.status(500).json({ success: false, message: "Failed to get upcoming tee times" });
    }
  }

  // GET /api/tee-times/:id
  async getTeeTime(req, res) {
    try {
      const teeTimeId = req.params.id;
      
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }

      const participants = await teeTimeRepository.getParticipants(teeTimeId);
      const invites = await inviteRepository.getInvitesByTeeTime(teeTimeId);

      res.json({
        success: true,
        teeTime: {
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
            avatar: teeTime.avatar_url
          },
          participants: participants.map(p => ({
            id: p.id,
            userId: p.user_id,
            name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            avatar: p.avatar_url,
            handicap: p.handicap,
            position: p.position,
            isCreator: p.is_creator
          })),
          invites: invites.map(i => ({
            id: i.id,
            status: i.status,
            invitee: {
              userId: i.invitee_user_id,
              phone: i.invitee_phone,
              name: i.invitee_name || `${i.first_name || ''} ${i.last_name || ''}`.trim(),
              avatar: i.avatar_url
            },
            position: i.position,
            smsSent: i.sms_sent
          }))
        }
      });
    } catch (error) {
      logger.error("Get tee time error:", error);
      res.status(500).json({ success: false, message: "Failed to get tee time" });
    }
  }

  // POST /api/tee-times/:id/cancel
  async cancelTeeTime(req, res) {
    try {
      const userId = req.user.id;
      const teeTimeId = req.params.id;

      const cancelled = await teeTimeRepository.cancelTeeTime(teeTimeId, userId);
      if (!cancelled) {
        return res.status(404).json({ success: false, message: "Tee time not found or not authorized" });
      }

      res.json({ success: true, message: "Tee time cancelled" });
    } catch (error) {
      logger.error("Cancel tee time error:", error);
      res.status(500).json({ success: false, message: "Failed to cancel tee time" });
    }
  }

  // GET /api/tee-times/calendar?start=&end=
  async getCalendar(req, res) {
    try {
      const userId = req.user.id;
      const { start, end } = req.query;

      if (!start || !end) {
        return res.status(400).json({ success: false, message: "start and end dates required" });
      }

      // Update past tee times to completed status in database
      const updated = await teeTimeRepository.markPastTeeTimesCompleted();
      if (updated.length > 0) {
        logger.info(`Auto-completed ${updated.length} past tee times`);
      }

      const teeTimes = await teeTimeRepository.getTeeTimesByDateRange(userId, start, end);
      
      // Group by date
      const calendar = {};
      teeTimes.forEach(t => {
        const dateKey = formatDateLocal(t.tee_date);
        if (!calendar[dateKey]) {
          calendar[dateKey] = [];
        }
        calendar[dateKey].push({
          id: t.id,
          courseName: t.course_name,
          courseLocation: t.course_location,
          teeTime: t.tee_time,
          status: t.status,
          participantCount: parseInt(t.participant_count),
          creatorId: t.creator_id
        });
      });

      res.json({ success: true, calendar });
    } catch (error) {
      logger.error("Get calendar error:", error);
      res.status(500).json({ success: false, message: "Failed to get calendar" });
    }
  }

  // GET /api/tee-times/history
  async getHistory(req, res) {
    try {
      const userId = req.user.id;
      const { filter = 'all', limit = 20, offset = 0 } = req.query;

      const history = await teeTimeRepository.getTeeTimeHistory(userId, {
        filter,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const formatted = history.map(t => ({
        id: t.id,
        courseName: t.course_name,
        courseLocation: t.course_location,
        teeDate: formatDateLocal(t.tee_date),
        teeTime: t.tee_time,
        status: t.tee_time_status,
        userRole: t.user_role,
        participantStatus: t.participant_status,
        attendanceStatus: t.attendance_status,
        gameScore: t.game_score,
        holesPlayed: t.holes_played,
        organizer: {
          id: t.creator_id,
          firstName: t.creator_first_name,
          lastName: t.creator_last_name,
          avatar: t.creator_avatar
        },
        participantCount: parseInt(t.participant_count),
        maxPlayers: t.max_players
      }));

      res.json({ success: true, history: formatted });
    } catch (error) {
      logger.error("Get tee time history error:", error);
      res.status(500).json({ success: false, message: "Failed to get history" });
    }
  }

  // POST /api/tee-times/:id/invites/:inviteId/skip
  // Manually skip an invite and advance to the next roster member
  async skipInvite(req, res) {
    try {
      const userId = req.user.id;
      const { id: teeTimeId, inviteId } = req.params;

      // Verify user is the creator of this tee time
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }
      if (teeTime.creator_id !== userId) {
        return res.status(403).json({ success: false, message: "Only the organizer can skip invites" });
      }

      // Get the invite to skip
      const invite = await inviteRepository.getInviteById(inviteId);
      if (!invite || invite.tee_time_id !== teeTimeId) {
        return res.status(404).json({ success: false, message: "Invite not found" });
      }

      // Can only skip pending invites
      if (invite.status !== 'pending') {
        return res.status(400).json({ success: false, message: "Can only skip pending invites" });
      }

      // Mark the invite as skipped (using 'expired' status)
      await inviteRepository.respondToInvite(inviteId, invite.invitee_user_id, 'expired');

      // Get the next pending invite in the queue
      const nextInvite = await inviteRepository.getNextPendingInvite(teeTimeId);

      // If there's a next invite, activate it with a new expiry window
      let activatedInvite = null;
      if (nextInvite) {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        activatedInvite = await inviteRepository.activateInvite(nextInvite.id, expiresAt);
      }

      // Get updated invites list
      const invites = await inviteRepository.getInvitesByTeeTime(teeTimeId);

      res.json({ 
        success: true, 
        message: "Invite skipped, advanced to next member",
        skippedInviteId: inviteId,
        nextInvite: activatedInvite ? {
          id: activatedInvite.id,
          inviteeName: nextInvite.first_name ? `${nextInvite.first_name} ${nextInvite.last_name}` : nextInvite.invitee_name,
          expiresAt: activatedInvite.expires_at
        } : null,
        invites: invites.map(i => ({
          id: i.id,
          status: i.status,
          invitee: {
            userId: i.invitee_user_id,
            phone: i.invitee_phone,
            name: i.invitee_name || `${i.first_name || ''} ${i.last_name || ''}`.trim(),
            avatar: i.avatar_url
          },
          position: i.position,
          expiresAt: i.expires_at
        }))
      });
    } catch (error) {
      logger.error("Skip invite error:", error);
      res.status(500).json({ success: false, message: "Failed to skip invite" });
    }
  }

  // POST /api/tee-times/:id/on-deck-invites
  // Send FCFS invites to selected On-Deck players
  async sendOnDeckInvites(req, res) {
    try {
      const userId = req.user.id;
      const teeTimeId = req.params.id;
      const { playerIds, deadline } = req.body;

      const deadlineDate = deadline ? new Date(deadline) : null;
      
      const invites = await inviteManagementService.sendOnDeckInvites(
        teeTimeId,
        userId,
        playerIds,
        deadlineDate
      );

      res.status(201).json({
        success: true,
        message: `${invites.length} On-Deck invites sent (FCFS)`,
        invites: invites.map(i => ({
          id: i.id,
          inviteeName: i.invitee_name,
          expiresAt: i.expires_at
        }))
      });
    } catch (error) {
      logger.error("Send On-Deck invites error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to send On-Deck invites" });
    }
  }

  // POST /api/tee-times/:id/fcfs-deadline
  // Set FCFS response deadline for all pending invites
  async setFCFSDeadline(req, res) {
    try {
      const userId = req.user.id;
      const teeTimeId = req.params.id;
      const { deadline } = req.body;

      // Verify user is the creator
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }
      if (teeTime.creator_id !== userId) {
        return res.status(403).json({ success: false, message: "Only the organizer can set deadline" });
      }

      const deadlineDate = new Date(deadline);
      if (deadlineDate <= new Date()) {
        return res.status(400).json({ success: false, message: "Deadline must be in the future" });
      }

      const updatedInvites = await inviteRepository.setFCFSDeadline(teeTimeId, deadlineDate);

      res.json({
        success: true,
        message: `Deadline set for ${updatedInvites.length} pending invites`,
        deadline: deadlineDate,
        updatedCount: updatedInvites.length
      });
    } catch (error) {
      logger.error("Set FCFS deadline error:", error);
      res.status(500).json({ success: false, message: "Failed to set deadline" });
    }
  }
}

module.exports = new TeeTimeController();
