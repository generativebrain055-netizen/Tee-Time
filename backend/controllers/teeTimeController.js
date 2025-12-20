const teeTimeRepository = require("../repositories/teeTimeRepository");
const inviteRepository = require("../repositories/inviteRepository");
const rosterRepository = require("../repositories/rosterRepository");
const logger = require("../config/logger");

class TeeTimeController {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.createTeeTime = this.createTeeTime.bind(this);
    this.getTeeTimes = this.getTeeTimes.bind(this);
    this.getUpcoming = this.getUpcoming.bind(this);
    this.getTeeTime = this.getTeeTime.bind(this);
    this.cancelTeeTime = this.cancelTeeTime.bind(this);
    this.getCalendar = this.getCalendar.bind(this);
  }

  // POST /api/tee-times
  async createTeeTime(req, res) {
    try {
      const userId = req.user.id;
      const { courseName, courseLocation, teeDate, teeTime, maxPlayers, inviteType, notes } = req.body;

      const teeTimeData = await teeTimeRepository.createTeeTime(userId, {
        courseName, courseLocation, teeDate, teeTime, maxPlayers, inviteType, notes
      });

      res.status(201).json({ success: true, teeTime: teeTimeData });
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

      const teeTimes = await teeTimeRepository.getUserTeeTimes(userId, status);
      
      const formatted = teeTimes.map(t => ({
        id: t.id,
        courseName: t.course_name,
        courseLocation: t.course_location,
        teeDate: t.tee_date,
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

      const teeTimes = await teeTimeRepository.getUpcomingTeeTimes(userId, limit);
      
      // Get participants for each tee time
      const formatted = await Promise.all(teeTimes.map(async (t) => {
        const participants = await teeTimeRepository.getParticipants(t.id);
        return {
          id: t.id,
          courseName: t.course_name,
          courseLocation: t.course_location,
          teeDate: t.tee_date,
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
          teeDate: teeTime.tee_date,
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

      const teeTimes = await teeTimeRepository.getTeeTimesByDateRange(userId, start, end);
      
      // Group by date
      const calendar = {};
      teeTimes.forEach(t => {
        const dateKey = t.tee_date.toISOString().split('T')[0];
        if (!calendar[dateKey]) {
          calendar[dateKey] = [];
        }
        calendar[dateKey].push({
          id: t.id,
          courseName: t.course_name,
          teeTime: t.tee_time,
          status: t.status,
          participantCount: parseInt(t.participant_count)
        });
      });

      res.json({ success: true, calendar });
    } catch (error) {
      logger.error("Get calendar error:", error);
      res.status(500).json({ success: false, message: "Failed to get calendar" });
    }
  }
}

module.exports = new TeeTimeController();
