const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");
const socialRateService = require("./socialRateService");
const { formatDateLocal, createTeeDateTime } = require("../utils/dateUtils");

class AttendanceService {
  /**
   * Initialize attendance records when tee time is confirmed
   */
  async initializeAttendance(teeTimeId) {
    // Get all active participants for this tee time (exclude cancelled)
    const { data: participants, error: fetchError } = await supabaseAdmin
      .from("tee_time_participants")
      .select("id, user_id, tee_time_id, status")
      .eq("tee_time_id", teeTimeId)
      .or("status.is.null,status.neq.cancelled");

    if (fetchError) {
      logger.error(`Error fetching participants for tee time ${teeTimeId}:`, fetchError.message);
      throw fetchError;
    }

    // Create attendance records only for active participants
    const attendanceRecords = (participants || []).map(p => ({
      tee_time_id: p.tee_time_id,
      participant_id: p.id,
      user_id: p.user_id,
      status: "pending"
    }));

    const { data, error } = await supabaseAdmin
      .from("tee_time_attendance")
      .upsert(attendanceRecords, {
        onConflict: "tee_time_id,participant_id",
        ignoreDuplicates: true
      })
      .select();

    if (error) {
      logger.error(`Error initializing attendance for tee time ${teeTimeId}:`, error.message);
      throw error;
    }

    logger.info(`Initialized ${data?.length || 0} attendance records for tee time ${teeTimeId}`);
    return data || [];
  }

  /**
   * Get attendance records for a tee time (Figma 437-321: Pre tee time check-in)
   */
  async getAttendanceByTeeTime(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_time_attendance")
        .select(`
          *,
          tee_time_participants!inner (
            id,
            name,
            is_creator,
            position,
            user_id
          ),
          users (
            id,
            first_name,
            last_name,
            username
          ),
          user_profiles (
            avatar_url
          )
        `)
        .eq("tee_time_id", teeTimeId)
        .order("created_at", { ascending: true });

      if (error) {
        logger.error(`Error fetching attendance for tee time ${teeTimeId}:`, error.message);
        return [];
      }

      // Format the data to extract nested fields
      const formatted = (data || []).map(record => {
        const participant = Array.isArray(record.tee_time_participants) 
          ? record.tee_time_participants[0] 
          : record.tee_time_participants;
        const user = Array.isArray(record.users) 
          ? record.users[0] 
          : record.users;
        const profile = Array.isArray(record.user_profiles)
          ? record.user_profiles[0]
          : record.user_profiles;

        return {
          ...record,
          participant_id: participant?.id || record.participant_id,
          participant_name: participant?.name || 
            (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : null) ||
            'Unknown',
          first_name: user?.first_name || null,
          last_name: user?.last_name || null,
          avatar_url: profile?.avatar_url || null,
          is_creator: participant?.is_creator || false,
          user_id: participant?.user_id || record.user_id,
        };
      });

      return formatted;
    } catch (error) {
      logger.error(`Error in getAttendanceByTeeTime for tee time ${teeTimeId}:`, error);
      return [];
    }
  }

  /**
   * Get single attendance record
   */
  /**
   * Minimal attendance rows (no joins) — reliable for batch ID resolution when embedded selects fail.
   */
  async listAttendanceRowsForTeeTime(teeTimeId) {
    const { data, error } = await supabaseAdmin
      .from("tee_time_attendance")
      .select("id, participant_id, user_id, status, tee_time_id")
      .eq("tee_time_id", teeTimeId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error(`listAttendanceRowsForTeeTime ${teeTimeId}:`, error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Ensure a tee_time_attendance row exists for this participant (batch / temp-id safety).
   */
  async ensureAttendanceRowForParticipant(teeTimeId, participantId) {
    const { data: p, error: pe } = await supabaseAdmin
      .from("tee_time_participants")
      .select("id, user_id, tee_time_id, status")
      .eq("tee_time_id", teeTimeId)
      .eq("id", participantId)
      .maybeSingle();

    if (pe || !p) {
      logger.warn(`ensureAttendanceRowForParticipant: participant not found ${participantId} for tee ${teeTimeId}`);
      return null;
    }
    if (p.status === "cancelled") {
      return null;
    }

    const { error: upErr } = await supabaseAdmin.from("tee_time_attendance").upsert(
      {
        tee_time_id: teeTimeId,
        participant_id: p.id,
        user_id: p.user_id,
        status: "pending",
      },
      { onConflict: "tee_time_id,participant_id", ignoreDuplicates: true },
    );

    if (upErr) {
      logger.error(`ensureAttendanceRowForParticipant upsert:`, upErr.message);
      return null;
    }

    const { data: row, error: re } = await supabaseAdmin
      .from("tee_time_attendance")
      .select("id, participant_id")
      .eq("tee_time_id", teeTimeId)
      .eq("participant_id", p.id)
      .maybeSingle();

    if (re) {
      logger.error(`ensureAttendanceRowForParticipant fetch row:`, re.message);
      return null;
    }
    return row;
  }

  async getAttendanceById(attendanceId) {
    const { data, error } = await supabaseAdmin
      .from("tee_time_attendance")
      .select("*")
      .eq("id", attendanceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error(`Error fetching attendance ${attendanceId}:`, error.message);
    }

    return data || null;
  }

  /**
   * Get attendance by user for a specific tee time
   */
  async getAttendanceByUser(teeTimeId, userId) {
    const { data, error } = await supabaseAdmin
      .from("tee_time_attendance")
      .select("*")
      .eq("tee_time_id", teeTimeId)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error(`Error fetching attendance for user ${userId} in tee time ${teeTimeId}:`, error.message);
    }

    return data || null;
  }

  /**
   * One-tap check-in: Mark all participants as present (Figma 437-321: Pre tee time check-in)
   */
  async checkInAll(teeTimeId, organizerId) {
    try {
      const attendance = await this.getAttendanceByTeeTime(teeTimeId);
      
      if (attendance.length === 0) {
        // Initialize attendance if needed
        await this.initializeAttendance(teeTimeId);
        const refreshed = await this.getAttendanceByTeeTime(teeTimeId);
        if (refreshed.length === 0) {
          throw new Error('No participants found for this tee time');
        }
        attendance.push(...refreshed);
      }
      
      let checkedInCount = 0;
      const now = new Date().toISOString();
      
      // Mark all pending participants as present
      for (const record of attendance) {
        if (record.status === 'pending' || record.status === null) {
          try {
            await this.markPresent(record.id, organizerId);
            checkedInCount++;
          } catch (error) {
            logger.error(`Failed to mark attendance ${record.id} as present:`, error.message);
            // Continue with other participants
          }
        } else if (record.status === 'present') {
          checkedInCount++; // Already checked in
        }
      }
      
      const { data: ttRow } = await supabaseAdmin
        .from("tee_times")
        .select("tee_date, tee_time")
        .eq("id", teeTimeId)
        .single();

      if (!this.isBeforeScheduledTeeTime(ttRow)) {
        await this.completeCheckIn(teeTimeId, organizerId);
      } else {
        logger.info(
          `checkInAll: attendance saved; deferring completeCheckIn until scheduled tee time (${teeTimeId})`,
        );
      }

      logger.info(`All participants checked in for tee time ${teeTimeId} by ${organizerId}. Checked in: ${checkedInCount}/${attendance.length}`);
      
      return { success: true, checkedIn: checkedInCount, total: attendance.length };
    } catch (error) {
      logger.error(`Error in checkInAll for tee time ${teeTimeId}:`, error);
      throw error;
    }
  }

  /**
   * Mark individual participant as present
   */
  async markPresent(attendanceId, checkedInBy) {
    const { data, error } = await supabaseAdmin
      .from("tee_time_attendance")
      .update({
        status: "present",
        checked_in_at: new Date().toISOString(),
        checked_in_by: checkedInBy,
        updated_at: new Date().toISOString()
      })
      .eq("id", attendanceId)
      .select()
      .single();

    if (error) {
      logger.error(`Error marking attendance ${attendanceId} as present:`, error.message);
      throw error;
    }

    return data;
  }

  /**
   * Mark individual participant as no-show (applies penalty)
   */
  async markNoShow(attendanceId, markedBy) {
    const record = await this.getAttendanceById(attendanceId);
    
    if (!record) {
      throw new Error('Attendance record not found');
    }

    // Prevent duplicate penalties
    if (record.penalty_applied) {
      throw new Error('Penalty already applied for this attendance');
    }

    // Cannot mark cancelled participant as no-show
    if (record.status === 'cancelled') {
      throw new Error('Cannot mark cancelled participant as no-show');
    }

    // Cannot mark organizer as no-show
    const { data: participant, error: participantError } = await supabaseAdmin
      .from("tee_time_participants")
      .select("is_creator")
      .eq("id", record.participant_id)
      .single();

    if (participantError) {
      logger.error("Error checking participant:", participantError.message);
      throw participantError;
    }

    if (participant?.is_creator) {
      throw new Error('Cannot mark organizer as no-show');
    }

    // Apply no-show penalty if user exists
    let penaltyLogId = null;
    if (record.user_id) {
      const penaltyLog = await socialRateService.applyNoShowPenalty(
        record.user_id,
        record.tee_time_id,
        markedBy
      );
      penaltyLogId = penaltyLog?.id;
    }

    // Update attendance record
    const { data, error } = await supabaseAdmin
      .from("tee_time_attendance")
      .update({
        status: "no_show",
        marked_no_show_at: new Date().toISOString(),
        marked_no_show_by: markedBy,
        penalty_applied: true,
        penalty_log_id: penaltyLogId,
        updated_at: new Date().toISOString()
      })
      .eq("id", attendanceId)
      .select()
      .single();

    if (error) {
      logger.error(`Error marking no-show for attendance ${attendanceId}:`, error.message);
      throw error;
    }

    logger.info(`Marked no-show for attendance ${attendanceId}, penalty log: ${penaltyLogId}`);
    return data;
  }

  /**
   * Apply automatic no-show penalties when tee time is completed
   * For participants who didn't check in (status is still 'pending' or null)
   */
  async applyAutomaticNoShowPenalties(teeTimeId, organizerId) {
    try {
      // Get all attendance records for this tee time
      let attendance = await this.getAttendanceByTeeTime(teeTimeId);
      
      if (!attendance || attendance.length === 0) {
        // No attendance records exist - initialize them first
        await this.initializeAttendance(teeTimeId);
        attendance = await this.getAttendanceByTeeTime(teeTimeId);
        if (!attendance || attendance.length === 0) {
          logger.info(`No attendance records found for tee time ${teeTimeId} - skipping automatic penalties`);
          return { applied: 0 };
        }
      }

      let appliedCount = 0;
      
      // Apply penalty to participants who didn't check in
      for (const record of attendance) {
        // Skip participants already marked as present, no-show, or cancelled
        if (record.status === 'present' || record.status === 'no_show' || record.status === 'cancelled') {
          continue;
        }
        
        // Apply penalty if status is 'pending' or null (didn't check in)
        // Status will be 'pending' if attendance was initialized, or null if not initialized
        if (record.status !== 'pending' && record.status !== null) {
          continue;
        }
        
        // Check if participant is organizer or cancelled
        const { data: participant, error: participantError } = await supabaseAdmin
          .from("tee_time_participants")
          .select("is_creator, status")
          .eq("id", record.participant_id)
          .single();

        if (participantError || !participant) {
          logger.error(`Error checking participant ${record.participant_id}:`, participantError?.message);
          continue;
        }

        // Skip organizer
        if (participant.is_creator) {
          continue;
        }

        // Skip cancelled participants (double-check)
        if (participant.status === 'cancelled') {
          continue;
        }

        // Apply no-show penalty
        try {
          await this.markNoShow(record.id, organizerId);
          appliedCount++;
          logger.info(`Applied automatic no-show penalty for attendance ${record.id} (user ${record.user_id})`);
        } catch (penaltyError) {
          // Log but continue with other participants
          logger.error(`Error applying no-show penalty for attendance ${record.id}:`, penaltyError.message);
        }
      }

      logger.info(`Applied automatic no-show penalties for tee time ${teeTimeId}: ${appliedCount} penalties applied`);
      return { applied: appliedCount };
    } catch (error) {
      logger.error(`Error in applyAutomaticNoShowPenalties for tee time ${teeTimeId}:`, error);
      throw error;
    }
  }

  /**
   * Handle user cancellation (before tee time)
   */
  async handleCancellation(teeTimeId, userId, teeDateTime, teeTimeStatus = 'pending') {
    // Try to update attendance record if it exists
    const attendance = await this.getAttendanceByUser(teeTimeId, userId);
    
    if (attendance) {
      const { error } = await supabaseAdmin
        .from("tee_time_attendance")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", attendance.id);

      if (error) {
        logger.error(`Error cancelling attendance for user ${userId}:`, error.message);
      } else {
        logger.info(`User ${userId} cancelled attendance record for tee time ${teeTimeId}`);
      }
    } else {
      logger.info(`No attendance record found for user ${userId} in tee time ${teeTimeId} - skipping attendance update`);
    }

    // Apply late cancellation penalty if within 24h AND not a confirmed tee time
    if (userId && teeTimeStatus !== 'confirmed') {
      await socialRateService.applyLateCancellationPenalty(userId, teeTimeId, teeDateTime);
    }
    
    return attendance;
  }

  /**
   * Complete check-in process (Figma 437-321: Pre tee time check-in)
   * Marks tee time as completed after all attendance is recorded
   */
  async completeCheckIn(teeTimeId, completedBy) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_times")
        .update({
          check_in_completed_at: new Date().toISOString(),
          check_in_completed_by: completedBy,
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("id", teeTimeId)
        .select()
        .single();

      if (error) {
        logger.error(`Error completing check-in for tee time ${teeTimeId}:`, error.message);
        throw error;
      }

      logger.info(`Check-in completed for tee time ${teeTimeId} by ${completedBy}`);
      return data;
    } catch (error) {
      logger.error(`Error in completeCheckIn for tee time ${teeTimeId}:`, error);
      throw error;
    }
  }

  /**
   * Batch update attendance and complete check-in (Figma 437-321: Pre tee time check-in)
   * Used when marking some as no-show and others as present
   */
  async batchUpdateAttendance(teeTimeId, updates, completedBy) {
    try {
      const results = {
        present: 0,
        noShow: 0,
        errors: []
      };

      // Process each update
      for (const update of updates) {
        try {
          if (update.status === 'present') {
            await this.markPresent(update.attendanceId, completedBy);
            results.present++;
          } else if (update.status === 'no_show') {
            await this.markNoShow(update.attendanceId, completedBy);
            results.noShow++;
          }
        } catch (error) {
          logger.error(`Failed to update attendance ${update.attendanceId}:`, error.message);
          results.errors.push({ attendanceId: update.attendanceId, error: error.message });
        }
      }

      if (results.present > 0 || results.noShow > 0) {
        const { data: ttRow } = await supabaseAdmin
          .from("tee_times")
          .select("tee_date, tee_time")
          .eq("id", teeTimeId)
          .single();

        if (!this.isBeforeScheduledTeeTime(ttRow)) {
          await this.completeCheckIn(teeTimeId, completedBy);
        } else {
          logger.info(
            `batchUpdateAttendance: deferring completeCheckIn until scheduled tee time (${teeTimeId})`,
          );
        }
      }

      return results;
    } catch (error) {
      logger.error(`Error in batchUpdateAttendance for tee time ${teeTimeId}:`, error);
      throw error;
    }
  }

  /**
   * Start check-in process (transition to in_progress)
   */
  async startCheckIn(teeTimeId) {
    const { data, error } = await supabaseAdmin
      .from("tee_times")
      .update({
        check_in_started_at: new Date().toISOString(),
        status: "in_progress",
        updated_at: new Date().toISOString()
      })
      .eq("id", teeTimeId)
      .eq("status", "confirmed")
      .select()
      .single();

    if (error) {
      logger.error(`Error starting check-in for tee time ${teeTimeId}:`, error.message);
      throw error;
    }

    return data;
  }

  /**
   * Auto-complete check-in (called by cron job)
   * Marks all pending as present (benefit of doubt)
   */
  async autoCompleteCheckIn(teeTimeId) {
    // Mark all pending as present
    const { error: updateError } = await supabaseAdmin
      .from("tee_time_attendance")
      .update({
        status: "present",
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("tee_time_id", teeTimeId)
      .eq("status", "pending");

    if (updateError) {
      logger.error(`Error auto-completing attendance for tee time ${teeTimeId}:`, updateError.message);
    }

    // Complete the tee time
    const { error: completeError } = await supabaseAdmin
      .from("tee_times")
      .update({
        check_in_completed_at: new Date().toISOString(),
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", teeTimeId);

    if (completeError) {
      logger.error(`Error completing tee time ${teeTimeId}:`, completeError.message);
    }
    
    logger.info(`Auto-completed check-in for tee time ${teeTimeId}`);
  }

  /**
   * Check if check-in is available for a tee time (Figma 437-321: Pre tee time check-in)
   * On the calendar day of the tee: available from start of that day until 4 hours after tee time
   * (organizers can open check-in the morning of, not only 30 min before).
   * Other days: not yet, or closed if past.
   */
  async isCheckInAvailable(teeTimeId) {
    const { data: teeTime, error } = await supabaseAdmin
      .from("tee_times")
      .select("*")
      .eq("id", teeTimeId)
      .single();

    if (error || !teeTime) {
      return { available: false, reason: 'Tee time not found' };
    }
    
    // Use JavaScript local time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Parse tee_date
    const teeDateStr = formatDateLocal(teeTime.tee_date);
    const [year, month, day] = teeDateStr.split('-').map(Number);
    const teeDate = new Date(year, month - 1, day);
    const isToday = today.getTime() === teeDate.getTime();
    
    if (!isToday) {
      if (teeDate < today) {
        return { available: false, reason: 'Check-in window closed' };
      }
      return { available: false, reason: 'Check-in not available yet' };
    }
    
    // Calculate minutes until tee time
    const currentTimeStr = now.toTimeString().slice(0, 8);
    const teeTimeStr = teeTime.tee_time;
    
    const [currentH, currentM, currentS] = currentTimeStr.split(':').map(Number);
    const [teeH, teeM, teeS] = teeTimeStr.split(':').map(Number);
    
    const currentMinutes = currentH * 60 + currentM + currentS / 60;
    const teeMinutes = teeH * 60 + teeM + teeS / 60;
    const minutesUntilTeeTime = teeMinutes - currentMinutes;
    
    logger.debug(`Check-in availability: current=${currentTimeStr}, teeTime=${teeTimeStr}, minutesUntil=${minutesUntilTeeTime.toFixed(1)}`);

    if (teeTime.check_in_completed_at) {
      return { available: false, reason: "Check-in already completed" };
    }

    // Same calendar day: allow any time until 4 hours after scheduled tee time
    if (minutesUntilTeeTime < -240) {
      return { available: false, reason: "Check-in window closed" };
    }

    return { available: true, teeTime };
  }

  /**
   * Whether the organizer may submit check-in (Save / batch / check-in all).
   * Before scheduled tee_date + tee_time: always allowed (update participant status),
   * except for cancelled tee times. After that moment: blocked if tee is completed
   * or check-in was already finalized.
   */
  async canOrganizerSubmitCheckIn(teeTimeId) {
    const { data: teeTime, error } = await supabaseAdmin
      .from("tee_times")
      .select("id, status, check_in_completed_at, tee_date, tee_time")
      .eq("id", teeTimeId)
      .single();

    if (error || !teeTime) {
      return { ok: false, reason: "Tee time not found" };
    }
    if (teeTime.status === "cancelled") {
      return { ok: false, reason: "Tee time cancelled" };
    }
    if (this.isBeforeScheduledTeeTime(teeTime)) {
      return { ok: true, teeTime };
    }
    if (teeTime.status === "completed") {
      return { ok: false, reason: "Tee time already completed" };
    }
    if (teeTime.check_in_completed_at) {
      return { ok: false, reason: "Check-in already completed" };
    }
    return { ok: true, teeTime };
  }

  /**
   * True while "now" is strictly before scheduled tee_date + tee_time.
   * When true, organizer saves update attendance only — completeCheckIn is deferred
   * so Save stays available until the scheduled moment.
   */
  isBeforeScheduledTeeTime(teeTime) {
    if (!teeTime?.tee_date || teeTime.tee_time == null || teeTime.tee_time === "") {
      return false;
    }
    try {
      const scheduled = createTeeDateTime(teeTime.tee_date, String(teeTime.tee_time).trim());
      return Date.now() < scheduled.getTime();
    } catch (e) {
      logger.warn("isBeforeScheduledTeeTime failed:", e.message);
      return false;
    }
  }

  /**
   * Get attendance summary for a tee time
   */
  async getAttendanceSummary(teeTimeId) {
    const { data, error } = await supabaseAdmin
      .from("tee_time_attendance")
      .select("status")
      .eq("tee_time_id", teeTimeId);

    if (error) {
      logger.error(`Error fetching attendance summary for tee time ${teeTimeId}:`, error.message);
      return {
        total: 0,
        present: 0,
        no_show: 0,
        cancelled: 0,
        pending: 0
      };
    }

    const summary = {
      total: data.length,
      present: data.filter(a => a.status === 'present').length,
      no_show: data.filter(a => a.status === 'no_show').length,
      cancelled: data.filter(a => a.status === 'cancelled').length,
      pending: data.filter(a => a.status === 'pending').length
    };

    return summary;
  }
}

module.exports = new AttendanceService();
