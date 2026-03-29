/**
 * Tee Time Controller (Refactored)
 * Thin controller: HTTP request/response handling only
 * Business logic → teeTimeService
 * Response formatting → teeTimeFormatter
 *
 * @module controllers/teeTimeController
 */

const teeTimeService = require("../services/teeTimeService");
const inviteManagementService = require("../services/inviteManagementService");
const logger = require("../config/logger");
const {
  formatTeeTime,
  formatTeeTimeWithCount,
  formatTeeTimeWithParticipants,
  formatTeeTimeDetail,
  formatHistoryEntry,
  formatSkipInviteResponse,
  formatOnDeckInvites,
} = require("../formatters/teeTimeFormatter");

class TeeTimeController {
  constructor() {
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
    this.getOpenInvites = this.getOpenInvites.bind(this);
    this.joinOpenInvite = this.joinOpenInvite.bind(this);
  }

  /**
   * POST /api/tee-times
   * Create a new tee time
   */
  async createTeeTime(req, res) {
    try {
      const teeTime = await teeTimeService.createTeeTime(req.user.id, req.body);
      res.status(201).json({ success: true, teeTime: formatTeeTime(teeTime) });
    } catch (error) {
      logger.error("Create tee time error:", error);
      if (error.name === "TeeTimeServiceError") {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }
      res
        .status(500)
        .json({ success: false, message: "Failed to create tee time" });
    }
  }

  /**
   * GET /api/tee-times
   * Get user's tee times with optional status filter
   */
  async getTeeTimes(req, res) {
    try {
      const teeTimes = await teeTimeService.getTeeTimes(
        req.user.id,
        req.query.status,
      );
      res.json({
        success: true,
        teeTimes: teeTimes.map(formatTeeTimeWithCount),
      });
    } catch (error) {
      logger.error("Get tee times error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get tee times" });
    }
  }

  /**
   * GET /api/tee-times/upcoming
   * Get upcoming tee times with participant details
   */
  async getUpcoming(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const results = await teeTimeService.getUpcomingTeeTimes(
        req.user.id,
        limit,
      );
      const formatted = results.map(({ teeTime, participants }) =>
        formatTeeTimeWithParticipants(teeTime, participants),
      );
      res.json({ success: true, teeTimes: formatted });
    } catch (error) {
      logger.error("Get upcoming tee times error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get upcoming tee times" });
    }
  }

  /**
   * GET /api/tee-times/:id
   * Get single tee time with full details
   */
  async getTeeTime(req, res) {
    try {
      const result = await teeTimeService.getTeeTimeById(req.params.id);
      res.json({
        success: true,
        teeTime: formatTeeTimeDetail(
          result.teeTime,
          result.participants,
          result.invites,
          result.cancelledParticipants,
        ),
      });
    } catch (error) {
      logger.error("Get tee time error:", error);
      if (error.name === "TeeTimeServiceError") {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }
      res
        .status(500)
        .json({ success: false, message: "Failed to get tee time" });
    }
  }

  /**
   * POST /api/tee-times/:id/cancel
   * Cancel a tee time
   */
  async cancelTeeTime(req, res) {
    try {
      await teeTimeService.cancelTeeTime(req.params.id, req.user.id);
      res.json({ success: true, message: "Tee time cancelled" });
    } catch (error) {
      logger.error("Cancel tee time error:", error);
      if (error.name === "TeeTimeServiceError") {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }
      res
        .status(500)
        .json({ success: false, message: "Failed to cancel tee time" });
    }
  }

  /**
   * GET /api/tee-times/calendar?start=&end=
   * Get calendar view of tee times
   */
  async getCalendar(req, res) {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({
          success: false,
          message: "start and end dates required",
        });
      }
      const calendar = await teeTimeService.getCalendar(
        req.user.id,
        start,
        end,
      );
      res.json({ success: true, calendar });
    } catch (error) {
      logger.error("Get calendar error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get calendar" });
    }
  }

  /**
   * GET /api/tee-times/history
   * Get user's tee time history
   */
  async getHistory(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const { filter = "all", limit = 20, offset = 0 } = req.query;
      const history = await teeTimeService.getHistory(req.user.id, {
        filter,
        limit: parseInt(limit, 10) || 20,
        offset: parseInt(offset, 10) || 0,
      });
      const list = Array.isArray(history) ? history : [];
      res.json({ success: true, history: list.map(formatHistoryEntry) });
    } catch (error) {
      logger.error("Get tee time history error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get history" });
    }
  }

  /**
   * POST /api/tee-times/:id/invites/:inviteId/skip
   * Skip an invite and advance to next roster member
   */
  async skipInvite(req, res) {
    try {
      const { id: teeTimeId, inviteId } = req.params;
      const result = await teeTimeService.skipInvite(
        teeTimeId,
        inviteId,
        req.user.id,
      );
      res.json({
        success: true,
        message: "Invite skipped, advanced to next member",
        ...formatSkipInviteResponse(
          inviteId,
          result.nextInvite,
          result.activatedInvite,
          result.allInvites,
        ),
      });
    } catch (error) {
      logger.error("Skip invite error:", error);
      if (error.name === "TeeTimeServiceError") {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }
      res
        .status(500)
        .json({ success: false, message: "Failed to skip invite" });
    }
  }

  /**
   * POST /api/tee-times/:id/on-deck-invites
   * Send FCFS invites to On-Deck players
   */
  async sendOnDeckInvites(req, res) {
    try {
      const { playerIds, deadline } = req.body;
      const deadlineDate = deadline ? new Date(deadline) : null;

      const invites = await inviteManagementService.sendOnDeckInvites(
        req.params.id,
        req.user.id,
        playerIds,
        deadlineDate,
      );

      res.status(201).json({
        success: true,
        message: `${invites.length} On-Deck invites sent (FCFS)`,
        invites: formatOnDeckInvites(invites),
      });
    } catch (error) {
      logger.error("Send On-Deck invites error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send On-Deck invites",
      });
    }
  }

  /**
   * POST /api/tee-times/:id/fcfs-deadline
   * Set FCFS response deadline for pending invites
   */
  async setFCFSDeadline(req, res) {
    try {
      const result = await teeTimeService.setFCFSDeadline(
        req.params.id,
        req.user.id,
        req.body.deadline,
      );
      res.json({
        success: true,
        message: `Deadline set for ${result.updatedCount} pending invites`,
        deadline: result.deadline,
        updatedCount: result.updatedCount,
      });
    } catch (error) {
      logger.error("Set FCFS deadline error:", error);
      if (error.name === "TeeTimeServiceError") {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }
      res
        .status(500)
        .json({ success: false, message: "Failed to set deadline" });
    }
  }

  /**
   * GET /api/tee-times/open
   * Get Open invites (community board) filtered by distance
   */
  async getOpenInvites(req, res) {
    try {
      const userId = req.user.id;
      const { lat, lng, maxDistance, date, time, course } = req.query;

      // Get user's location from profile if not provided
      let userLat = lat ? parseFloat(lat) : null;
      let userLng = lng ? parseFloat(lng) : null;

      if (!userLat || !userLng) {
        // Try to get from user profile
        const userRepository = require("../repositories/userRepository");
        const user = await userRepository.findById(userId);
        if (user && user.location) {
          // Parse location if stored as JSON or coordinates
          // For now, require lat/lng in query
          return res.status(400).json({
            success: false,
            message: "Latitude and longitude required (lat, lng query params)",
          });
        }
      }

      const maxDist = maxDistance ? parseFloat(maxDistance) : null;
      const filterDate = date || null;
      const filterTime = time || null; // "morning", "afternoon", "evening"
      const filterCourse = course || null;
      
      const openInvites = await teeTimeRepository.getOpenInvites(
        userId,
        userLat,
        userLng,
        maxDist,
        filterDate,
        filterTime,
        filterCourse
      );

      res.json({
        success: true,
        teeTimes: openInvites || [],
        count: (openInvites || []).length,
      });
    } catch (error) {
      logger.error("Get open invites error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get open invites" });
    }
  }

  /**
   * POST /api/tee-times/:id/join
   * Join an Open invite (community board)
   */
  async joinOpenInvite(req, res) {
    try {
      const userId = req.user.id;
      const { id: teeTimeId } = req.params;

      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({
          success: false,
          message: "Tee time not found",
        });
      }

      if (teeTime.invite_type !== "open") {
        return res.status(400).json({
          success: false,
          message: "This tee time is not open for public joining",
        });
      }

      // Check if user is already a participant
      const participantCount = await teeTimeRepository.getParticipantCount(teeTimeId);
      const existingParticipant = await teeTimeRepository.getParticipantByUser(teeTimeId, userId);

      if (existingParticipant) {
        return res.status(400).json({
          success: false,
          message: "You are already a participant in this tee time",
        });
      }

      // Check if tee time is full
      if (participantCount >= teeTime.max_players) {
        return res.status(400).json({
          success: false,
          message: "This tee time is full",
        });
      }

      // Add user as participant
      const user = await require("../repositories/userRepository").findById(userId);
      const userName = `${user.first_name} ${user.last_name}`;

      await teeTimeRepository.addParticipant(
        teeTimeId,
        userId,
        null,
        userName,
        participantCount,
        false
      );

      res.json({
        success: true,
        message: "Successfully joined the tee time!",
      });
    } catch (error) {
      logger.error("Join open invite error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to join tee time" });
    }
  }
}

module.exports = new TeeTimeController();
