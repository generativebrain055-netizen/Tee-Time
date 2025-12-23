const attendanceService = require("../services/attendanceService");
const teeTimeRepository = require("../repositories/teeTimeRepository");
const inviteManagementService = require("../services/inviteManagementService");
const userRepository = require("../repositories/userRepository");
const logger = require("../config/logger");
const { createTeeDateTime } = require("../utils/dateUtils");

class AttendanceController {
  constructor() {
    this.getAttendance = this.getAttendance.bind(this);
    this.checkInAll = this.checkInAll.bind(this);
    this.updateAttendance = this.updateAttendance.bind(this);
    this.cancelParticipation = this.cancelParticipation.bind(this);
  }

  /**
   * GET /api/tee-times/:id/attendance
   * Get attendance status for all participants (organizer only)
   */
  async getAttendance(req, res) {
    try {
      const userId = req.user.id;
      const teeTimeId = req.params.id;

      // Verify user is organizer
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }
      if (teeTime.creator_id !== userId) {
        return res.status(403).json({ success: false, message: "Only organizer can view attendance" });
      }

      // Check if check-in is available
      const checkInStatus = await attendanceService.isCheckInAvailable(teeTimeId);
      
      // Auto-initialize attendance records if they don't exist
      let attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      if (attendance.length === 0) {
        await attendanceService.initializeAttendance(teeTimeId);
        attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      }
      
      // If still no attendance records, get participants directly
      if (attendance.length === 0) {
        const participants = await teeTimeRepository.getParticipants(teeTimeId);
        const formatted = participants.map(p => ({
          id: p.id,
          participantId: p.id,
          userId: p.user_id,
          name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
          avatar: p.avatar_url,
          isCreator: p.is_creator,
          status: 'pending',
          checkedInAt: null,
          markedNoShowAt: null,
          penaltyApplied: false
        }));
        
        return res.json({
          success: true,
          checkInAvailable: checkInStatus.available,
          checkInMessage: checkInStatus.reason,
          summary: {
            total: formatted.length,
            present: 0,
            noShow: 0,
            cancelled: 0,
            pending: formatted.length
          },
          attendance: formatted
        });
      }
      
      const summary = await attendanceService.getAttendanceSummary(teeTimeId);

      const formatted = attendance.map(a => ({
        id: a.id,
        participantId: a.participant_id,
        userId: a.user_id,
        name: a.participant_name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unknown',
        avatar: a.avatar_url,
        isCreator: a.is_creator,
        status: a.status,
        checkedInAt: a.checked_in_at,
        markedNoShowAt: a.marked_no_show_at,
        penaltyApplied: a.penalty_applied
      }));

      res.json({
        success: true,
        checkInAvailable: checkInStatus.available,
        checkInMessage: checkInStatus.reason,
        summary: {
          total: parseInt(summary.total),
          present: parseInt(summary.present),
          noShow: parseInt(summary.no_show),
          cancelled: parseInt(summary.cancelled),
          pending: parseInt(summary.pending)
        },
        attendance: formatted
      });
    } catch (error) {
      logger.error("Get attendance error:", error);
      res.status(500).json({ success: false, message: "Failed to get attendance" });
    }
  }


  /**
   * POST /api/tee-times/:id/check-in/all
   * One-tap check-in: Mark all participants as present
   */
  async checkInAll(req, res) {
    try {
      const userId = req.user.id;
      const teeTimeId = req.params.id;

      // Verify user is organizer
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }
      if (teeTime.creator_id !== userId) {
        return res.status(403).json({ success: false, message: "Only organizer can check in" });
      }

      // Initialize attendance records if they don't exist
      let attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      if (attendance.length === 0) {
        await attendanceService.initializeAttendance(teeTimeId);
        attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      }

      // If still no attendance, mark all participants as present directly
      if (attendance.length === 0) {
        const participants = await teeTimeRepository.getParticipants(teeTimeId);
        // Complete the tee time
        await attendanceService.completeCheckIn(teeTimeId, userId);
        return res.json({
          success: true,
          message: "All participants checked in successfully",
          checkedIn: participants.length
        });
      }

      const result = await attendanceService.checkInAll(teeTimeId, userId);

      res.json({
        success: true,
        message: "All participants checked in successfully",
        checkedIn: result.checkedIn
      });
    } catch (error) {
      logger.error("Check in all error:", error);
      res.status(500).json({ success: false, message: "Failed to check in" });
    }
  }

  /**
   * POST /api/tee-times/:id/check-in/:participantId
   * Mark individual participant status (present or no_show)
   */
  async updateAttendance(req, res) {
    try {
      const userId = req.user.id;
      const teeTimeId = req.params.id;
      const attendanceId = req.params.attendanceId;
      const { status } = req.body;

      if (!['present', 'no_show'].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status. Use 'present' or 'no_show'" });
      }

      // Verify user is organizer
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }
      if (teeTime.creator_id !== userId) {
        return res.status(403).json({ success: false, message: "Only organizer can update attendance" });
      }

      // Initialize attendance records if they don't exist
      let attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      if (attendance.length === 0) {
        await attendanceService.initializeAttendance(teeTimeId);
      }

      let result;
      if (status === 'present') {
        result = await attendanceService.markPresent(attendanceId, userId);
      } else {
        result = await attendanceService.markNoShow(attendanceId, userId);
      }

      res.json({
        success: true,
        message: status === 'present' ? 'Marked as present' : 'Marked as no-show',
        attendance: {
          id: result.id,
          status: result.status,
          penaltyApplied: result.penalty_applied
        }
      });
    } catch (error) {
      logger.error("Update attendance error:", error);
      res.status(400).json({ success: false, message: error.message || "Failed to update attendance" });
    }
  }

  /**
   * POST /api/tee-times/:id/cancel-participation
   * User cancels their own participation
   */
  async cancelParticipation(req, res) {
    try {
      const userId = req.user.id;
      const teeTimeId = req.params.id;

      logger.info(`Cancel participation request: userId=${userId}, teeTimeId=${teeTimeId}`);

      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }

      logger.info(`Tee time found: creator_id=${teeTime.creator_id}, status=${teeTime.status}`);

      // Cannot cancel if user is organizer
      if (teeTime.creator_id === userId) {
        return res.status(400).json({ 
          success: false, 
          message: "Organizer cannot cancel participation. Cancel the entire tee time instead." 
        });
      }

      // Check if tee time has already passed
      const teeDateTime = createTeeDateTime(teeTime.tee_date, teeTime.tee_time);
      if (teeDateTime < new Date()) {
        return res.status(400).json({ success: false, message: "Cannot cancel past tee time" });
      }

      // Apply penalty based on tee time status
      let penaltyApplied = false;
      let penaltyMessage = "";
      
      if (teeTime.status === 'confirmed') {
        // -10 points for cancelling a confirmed tee time
        const socialRateService = require("../services/socialRateService");
        await socialRateService.applyConfirmedCancellationPenalty(userId, teeTimeId);
        penaltyApplied = true;
        penaltyMessage = "A -10 Social Rate penalty was applied for cancelling a confirmed tee time.";
      } else {
        // Check if late cancellation penalty applies (within 24h)
        const hoursUntilTeeTime = (teeDateTime - new Date()) / (1000 * 60 * 60);
        if (hoursUntilTeeTime <= 24) {
          penaltyApplied = true;
          penaltyMessage = "A -5 Social Rate penalty was applied for late cancellation.";
        }
      }

      // Handle cancellation (updates attendance record if exists)
      await attendanceService.handleCancellation(teeTimeId, userId, teeDateTime, teeTime.status);

      // Remove from participants
      const removedParticipant = await teeTimeRepository.removeParticipantByUser(teeTimeId, userId);
      logger.info(`Removed participant result: ${JSON.stringify(removedParticipant)}`);

      // Get user info for notification
      const cancelledUser = await userRepository.findById(userId);
      const cancelledUserInfo = {
        id: userId,
        firstName: cancelledUser?.first_name || '',
        lastName: cancelledUser?.last_name || '',
      };

      // Trigger auto-reinvite based on invite type
      await inviteManagementService.handlePlayerCancellation(teeTimeId, userId, cancelledUserInfo);

      res.json({
        success: true,
        message: penaltyApplied 
          ? `Participation cancelled. ${penaltyMessage}`
          : "Participation cancelled successfully.",
        penaltyApplied
      });
    } catch (error) {
      logger.error("Cancel participation error:", error);
      res.status(500).json({ success: false, message: "Failed to cancel participation" });
    }
  }
}

module.exports = new AttendanceController();
