const attendanceService = require("../services/attendanceService");
const teeTimeRepository = require("../repositories/teeTimeRepository");
const inviteManagementService = require("../services/inviteManagementService");
const userRepository = require("../repositories/userRepository");
const logger = require("../config/logger");
const { createTeeDateTime } = require("../utils/dateUtils");

function attendanceRowMatchesId(row, attendanceId) {
  const raw = String(attendanceId || "").trim();
  if (!raw) return false;
  const idLc = String(row.id || "").toLowerCase();
  const pidLc = String(row.participant_id || "").toLowerCase();
  const rawLc = raw.toLowerCase();
  if (idLc === rawLc) return true;
  if (rawLc.startsWith("temp-")) {
    return pidLc === rawLc.slice(5);
  }
  return pidLc === rawLc;
}

function findAttendanceRowForUpdate(attendance, attendanceId) {
  return attendance.find((a) => attendanceRowMatchesId(a, attendanceId)) || null;
}

class AttendanceController {
  constructor() {
    this.getAttendance = this.getAttendance.bind(this);
    this.checkInAll = this.checkInAll.bind(this);
    this.updateAttendance = this.updateAttendance.bind(this);
    this.batchUpdateAttendance = this.batchUpdateAttendance.bind(this);
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
      
      // If still no attendance records, get participants directly and create temporary format
      if (attendance.length === 0) {
        const participants = await teeTimeRepository.getParticipants(teeTimeId);
        const formatted = participants.map(p => ({
          id: `temp-${p.id}`, // Temporary ID for frontend
          participantId: p.id,
          userId: p.user_id,
          name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
          avatar: p.avatar_url || null,
          isCreator: p.is_creator || false,
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

      // Format attendance records for frontend (Figma 437-321: Pre tee time check-in)
      const formatted = attendance.map(a => ({
        id: a.id,
        participantId: a.participant_id,
        userId: a.user_id,
        name: a.participant_name || 
              (a.first_name || a.last_name ? `${a.first_name || ''} ${a.last_name || ''}`.trim() : null) ||
              'Unknown',
        avatar: a.avatar_url || null,
        isCreator: a.is_creator || false,
        status: a.status || 'pending',
        checkedInAt: a.checked_in_at || null,
        markedNoShowAt: a.marked_no_show_at || null,
        penaltyApplied: a.penalty_applied || false
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

      const submit = await attendanceService.canOrganizerSubmitCheckIn(teeTimeId);
      if (!submit.ok) {
        return res.status(400).json({
          success: false,
          message: submit.reason || "Cannot check in",
        });
      }

      // Initialize attendance records if they don't exist
      let attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      if (attendance.length === 0) {
        await attendanceService.initializeAttendance(teeTimeId);
        attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      }

      // If still no attendance rows after initialize, avoid completing before scheduled tee time
      if (attendance.length === 0) {
        const participants = await teeTimeRepository.getParticipants(teeTimeId);
        if (!attendanceService.isBeforeScheduledTeeTime(teeTime)) {
          await attendanceService.completeCheckIn(teeTimeId, userId);
        }
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
        checkedIn: result.checkedIn || attendance.length
      });
    } catch (error) {
      logger.error("Check in all error:", error);
      res.status(500).json({ success: false, message: "Failed to check in" });
    }
  }

  /**
   * POST /api/tee-times/:id/check-in/:attendanceId
   * Mark individual participant status (present or no_show) (Figma 437-321: Pre tee time check-in)
   */
  async updateAttendance(req, res) {
    try {
      const userId = req.user.id;
      const teeTimeId = req.params.id;
      const attendanceId = req.params.attendanceId;
      const { status } = req.body;

      if (!['present', 'no_show'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid status. Use 'present' or 'no_show'" 
        });
      }

      // Verify user is organizer
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }
      if (teeTime.creator_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "Only organizer can update attendance" 
        });
      }

      const submit = await attendanceService.canOrganizerSubmitCheckIn(teeTimeId);
      if (!submit.ok) {
        return res.status(400).json({
          success: false,
          message: submit.reason || "Cannot update attendance",
        });
      }

      let attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      if (attendance.length === 0) {
        await attendanceService.initializeAttendance(teeTimeId);
        attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      }
      if (attendance.length === 0) {
        attendance = await attendanceService.listAttendanceRowsForTeeTime(teeTimeId);
      }

      let targetRecord = findAttendanceRowForUpdate(attendance, attendanceId);
      if (!targetRecord) {
        const pid = String(attendanceId).startsWith("temp-")
          ? String(attendanceId).slice(5)
          : String(attendanceId);
        await attendanceService.ensureAttendanceRowForParticipant(teeTimeId, pid);
        attendance = await attendanceService.listAttendanceRowsForTeeTime(teeTimeId);
        targetRecord = findAttendanceRowForUpdate(attendance, attendanceId);
      }

      if (!targetRecord) {
        return res.status(404).json({ 
          success: false, 
          message: "Attendance record not found" 
        });
      }

      let result;
      if (status === 'present') {
        result = await attendanceService.markPresent(targetRecord.id, userId);
      } else {
        result = await attendanceService.markNoShow(targetRecord.id, userId);
      }

      res.json({
        success: true,
        message: status === 'present' ? 'Marked as present' : 'Marked as no-show',
        attendance: {
          id: result.id,
          status: result.status,
          penaltyApplied: result.penalty_applied || false
        }
      });
    } catch (error) {
      logger.error("Update attendance error:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Failed to update attendance" 
      });
    }
  }

  /**
   * POST /api/tee-times/:id/check-in/batch
   * Batch update attendance (mark some as present, others as no-show) and complete check-in (Figma 437-321)
   */
  async batchUpdateAttendance(req, res) {
    try {
      const userId = req.user.id;
      const teeTimeId = req.params.id;
      const { updates } = req.body; // Array of { attendanceId, status }

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Updates array is required and must not be empty" 
        });
      }

      // Validate each update
      for (const update of updates) {
        if (!update.attendanceId || !['present', 'no_show'].includes(update.status)) {
          return res.status(400).json({ 
            success: false, 
            message: "Each update must have attendanceId and status ('present' or 'no_show')" 
          });
        }
      }

      // Verify user is organizer
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }
      if (teeTime.creator_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "Only organizer can update attendance" 
        });
      }

      const submit = await attendanceService.canOrganizerSubmitCheckIn(teeTimeId);
      if (!submit.ok) {
        return res.status(400).json({
          success: false,
          message: submit.reason || "Cannot update attendance",
        });
      }

      let attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      if (attendance.length === 0) {
        await attendanceService.initializeAttendance(teeTimeId);
        attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
      }
      if (attendance.length === 0) {
        attendance = await attendanceService.listAttendanceRowsForTeeTime(teeTimeId);
      }

      const participantIdsToEnsure = new Set();
      for (const update of updates) {
        if (!findAttendanceRowForUpdate(attendance, update.attendanceId)) {
          const raw = String(update.attendanceId);
          if (raw.toLowerCase().startsWith("temp-")) {
            participantIdsToEnsure.add(raw.slice(5));
          } else if (update.participantId) {
            participantIdsToEnsure.add(String(update.participantId));
          } else {
            participantIdsToEnsure.add(raw);
          }
        }
      }
      for (const pid of participantIdsToEnsure) {
        await attendanceService.ensureAttendanceRowForParticipant(teeTimeId, pid);
      }
      if (participantIdsToEnsure.size > 0) {
        attendance = await attendanceService.listAttendanceRowsForTeeTime(teeTimeId);
        if (attendance.length === 0) {
          attendance = await attendanceService.getAttendanceByTeeTime(teeTimeId);
        }
      }

      const resolvedUpdates = updates.map((update) => {
        const targetRecord = findAttendanceRowForUpdate(attendance, update.attendanceId);
        if (!targetRecord) {
          throw new Error(`Attendance record not found for ${update.attendanceId}`);
        }
        return {
          attendanceId: targetRecord.id,
          status: update.status,
        };
      });

      const result = await attendanceService.batchUpdateAttendance(teeTimeId, resolvedUpdates, userId);

      res.json({
        success: true,
        message: `Check-in complete: ${result.present} present, ${result.noShow} no-show(s)`,
        present: result.present,
        noShow: result.noShow,
        errors: result.errors.length > 0 ? result.errors : undefined
      });
    } catch (error) {
      logger.error("Batch update attendance error:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Failed to update attendance" 
      });
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
      const socialRateService = require("../services/socialRateService");
      let penaltyApplied = false;
      let penaltyMessage = "";
      let newSocialRate = null;
      let socialRateDelta = 0;

      const hoursUntilTeeTime = (teeDateTime - new Date()) / (1000 * 60 * 60);
      if (hoursUntilTeeTime <= 24) {
        newSocialRate = await socialRateService.applyLateCancellationPenalty(userId, teeTimeId, teeDateTime);
        penaltyApplied = true;
        socialRateDelta = -5;
        penaltyMessage = "A -5 Social Rate penalty was applied for cancelling within 24 hours of tee time.";
      }

      // Handle cancellation (updates attendance record if exists)
      await attendanceService.handleCancellation(teeTimeId, userId, teeDateTime);

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

      try {
        const organizerPipelineNudgeService = require("../services/organizerPipelineNudgeService");
        await organizerPipelineNudgeService.maybeNotifyOrganizerInsufficientPipeline(teeTimeId);
      } catch (nudgeErr) {
        logger.error("Organizer pipeline nudge after cancel participation", nudgeErr);
      }

      // When a confirmed player cancels, keep tee time in "in_progress" so it stays active (not reverted to pending)
      if (teeTime.status === "confirmed") {
        await teeTimeRepository.updateStatus(teeTimeId, "in_progress");
      }

      res.json({
        success: true,
        message: penaltyApplied 
          ? `Participation cancelled. ${penaltyMessage}`
          : "Participation cancelled successfully.",
        penaltyApplied,
        socialRateDelta: penaltyApplied ? socialRateDelta : 0,
        newSocialRate: newSocialRate ?? undefined
      });
    } catch (error) {
      logger.error("Cancel participation error:", error);
      res.status(500).json({ success: false, message: "Failed to cancel participation" });
    }
  }
}

module.exports = new AttendanceController();
