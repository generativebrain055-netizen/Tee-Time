const { pool } = require("../config/database");
const logger = require("../config/logger");
const socialRateService = require("./socialRateService");

class AttendanceService {
  /**
   * Initialize attendance records when tee time is confirmed
   */
  async initializeAttendance(teeTimeId) {
    const query = `
      INSERT INTO tee_time_attendance (tee_time_id, participant_id, user_id, status)
      SELECT 
        ttp.tee_time_id,
        ttp.id,
        ttp.user_id,
        'pending'
      FROM tee_time_participants ttp
      WHERE ttp.tee_time_id = $1
      ON CONFLICT (tee_time_id, participant_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [teeTimeId]);
    logger.info(`Initialized ${result.rowCount} attendance records for tee time ${teeTimeId}`);
    return result.rows;
  }

  /**
   * Get attendance records for a tee time
   */
  async getAttendanceByTeeTime(teeTimeId) {
    const query = `
      SELECT 
        tta.*,
        ttp.name as participant_name,
        ttp.is_creator,
        u.first_name,
        u.last_name,
        up.avatar_url
      FROM tee_time_attendance tta
      JOIN tee_time_participants ttp ON tta.participant_id = ttp.id
      LEFT JOIN users u ON tta.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE tta.tee_time_id = $1
      ORDER BY ttp.position ASC
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows;
  }

  /**
   * Get single attendance record
   */
  async getAttendanceById(attendanceId) {
    const query = `SELECT * FROM tee_time_attendance WHERE id = $1`;
    const result = await pool.query(query, [attendanceId]);
    return result.rows[0];
  }

  /**
   * Get attendance by user for a specific tee time
   */
  async getAttendanceByUser(teeTimeId, userId) {
    const query = `
      SELECT * FROM tee_time_attendance 
      WHERE tee_time_id = $1 AND user_id = $2
    `;
    const result = await pool.query(query, [teeTimeId, userId]);
    return result.rows[0];
  }


  /**
   * One-tap check-in: Mark all participants as present
   */
  async checkInAll(teeTimeId, organizerId) {
    const attendance = await this.getAttendanceByTeeTime(teeTimeId);
    
    for (const record of attendance) {
      if (record.status === 'pending') {
        await this.markPresent(record.id, organizerId);
      }
    }
    
    await this.completeCheckIn(teeTimeId, organizerId);
    logger.info(`All participants checked in for tee time ${teeTimeId} by ${organizerId}`);
    
    return { success: true, checkedIn: attendance.length };
  }

  /**
   * Mark individual participant as present
   */
  async markPresent(attendanceId, checkedInBy) {
    const query = `
      UPDATE tee_time_attendance 
      SET status = 'present', checked_in_at = NOW(), checked_in_by = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [attendanceId, checkedInBy]);
    return result.rows[0];
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

    // Cannot mark organizer as no-show (they're doing the check-in)
    const participantQuery = `
      SELECT is_creator FROM tee_time_participants WHERE id = $1
    `;
    const participantResult = await pool.query(participantQuery, [record.participant_id]);
    if (participantResult.rows[0]?.is_creator) {
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
    const updateQuery = `
      UPDATE tee_time_attendance 
      SET 
        status = 'no_show',
        marked_no_show_at = NOW(),
        marked_no_show_by = $2,
        penalty_applied = true,
        penalty_log_id = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [attendanceId, markedBy, penaltyLogId]);
    
    logger.info(`Marked no-show for attendance ${attendanceId}, penalty log: ${penaltyLogId}`);
    return result.rows[0];
  }

  /**
   * Handle user cancellation (before tee time)
   */
  async handleCancellation(teeTimeId, userId, teeDateTime, teeTimeStatus = 'pending') {
    // Try to update attendance record if it exists
    const attendance = await this.getAttendanceByUser(teeTimeId, userId);
    
    if (attendance) {
      const query = `
        UPDATE tee_time_attendance 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      await pool.query(query, [attendance.id]);
      logger.info(`User ${userId} cancelled attendance record for tee time ${teeTimeId}`);
    } else {
      logger.info(`No attendance record found for user ${userId} in tee time ${teeTimeId} - skipping attendance update`);
    }

    // Apply late cancellation penalty if within 24h AND not a confirmed tee time
    // (confirmed tee times get -10 penalty applied in controller)
    if (userId && teeTimeStatus !== 'confirmed') {
      await socialRateService.applyLateCancellationPenalty(userId, teeTimeId, teeDateTime);
    }
    
    return attendance;
  }


  /**
   * Complete check-in process
   */
  async completeCheckIn(teeTimeId, completedBy) {
    const query = `
      UPDATE tee_times 
      SET 
        check_in_completed_at = NOW(),
        check_in_completed_by = $2,
        status = 'completed',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [teeTimeId, completedBy]);
    return result.rows[0];
  }

  /**
   * Start check-in process (transition to in_progress)
   */
  async startCheckIn(teeTimeId) {
    const query = `
      UPDATE tee_times 
      SET 
        check_in_started_at = NOW(),
        status = 'in_progress',
        updated_at = NOW()
      WHERE id = $1 AND status = 'confirmed'
      RETURNING *
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows[0];
  }

  /**
   * Auto-complete check-in (called by cron job)
   * Marks all pending as present (benefit of doubt)
   */
  async autoCompleteCheckIn(teeTimeId) {
    // Mark all pending as present
    const updateQuery = `
      UPDATE tee_time_attendance 
      SET status = 'present', checked_in_at = NOW(), updated_at = NOW()
      WHERE tee_time_id = $1 AND status = 'pending'
    `;
    await pool.query(updateQuery, [teeTimeId]);

    // Complete the tee time
    const completeQuery = `
      UPDATE tee_times 
      SET 
        check_in_completed_at = NOW(),
        status = 'completed',
        updated_at = NOW()
      WHERE id = $1
    `;
    await pool.query(completeQuery, [teeTimeId]);
    
    logger.info(`Auto-completed check-in for tee time ${teeTimeId}`);
  }

  /**
   * Check if check-in is available for a tee time
   */
  async isCheckInAvailable(teeTimeId) {
    const query = `
      SELECT 
        tt.*,
        tt.tee_time as tee_time_value
      FROM tee_times tt
      WHERE tt.id = $1
    `;
    const result = await pool.query(query, [teeTimeId]);
    const teeTime = result.rows[0];
    
    if (!teeTime) return { available: false, reason: 'Tee time not found' };
    
    // Use JavaScript local time instead of PostgreSQL LOCALTIME (which returns UTC)
    const now = new Date();
    const today = now;
    const teeDate = new Date(teeTime.tee_date);
    const isToday = today.toDateString() === teeDate.toDateString();
    
    if (!isToday) {
      // For past dates, check-in window is closed
      if (teeDate < today) {
        return { available: false, reason: 'Check-in window closed' };
      }
      // For future dates, check-in not available yet
      return { available: false, reason: 'Check-in not available yet' };
    }
    
    // Calculate minutes until tee time using JavaScript local time
    const currentTimeStr = now.toTimeString().slice(0, 8); // HH:MM:SS
    const teeTimeStr = teeTime.tee_time_value; // HH:MM:SS from DB
    
    // Parse times to calculate difference
    const [currentH, currentM, currentS] = currentTimeStr.split(':').map(Number);
    const [teeH, teeM, teeS] = teeTimeStr.split(':').map(Number);
    
    const currentMinutes = currentH * 60 + currentM + currentS / 60;
    const teeMinutes = teeH * 60 + teeM + teeS / 60;
    const minutesUntilTeeTime = teeMinutes - currentMinutes;
    
    logger.debug(`Check-in availability: current=${currentTimeStr}, teeTime=${teeTimeStr}, minutesUntil=${minutesUntilTeeTime.toFixed(1)}`);
    
    // Check-in available from 30 minutes before to 60 minutes after
    if (minutesUntilTeeTime > 30) {
      return { available: false, reason: 'Check-in not available yet' };
    }
    
    if (minutesUntilTeeTime < -60) {
      return { available: false, reason: 'Check-in window closed' };
    }
    
    if (teeTime.check_in_completed_at) {
      return { available: false, reason: 'Check-in already completed' };
    }
    
    return { available: true, teeTime };
  }

  /**
   * Get attendance summary for a tee time
   */
  async getAttendanceSummary(teeTimeId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'present') as present,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM tee_time_attendance
      WHERE tee_time_id = $1
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows[0];
  }
}

module.exports = new AttendanceService();
