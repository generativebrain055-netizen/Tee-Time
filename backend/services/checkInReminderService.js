const { pool } = require("../config/database");
const notificationService = require("./notificationService");
const logger = require("../config/logger");

/**
 * Check-In Reminder Service
 * Handles sending notifications to organizers 5 minutes before tee time
 */
class CheckInReminderService {
  /**
   * Find tee times starting in the next 5-6 minutes that haven't been notified
   * and send check-in reminders to organizers
   */
  async processUpcomingTeeTimes() {
    try {
      // Get server's local time and compare against tee times
      // We calculate the time window in JavaScript to avoid timezone issues with PostgreSQL
      const now = new Date();
      const localTimeStr = now.toTimeString().slice(0, 8); // HH:MM:SS format
      
      // Calculate 4 and 6 minutes from now
      const fourMinLater = new Date(now.getTime() + 4 * 60 * 1000);
      const sixMinLater = new Date(now.getTime() + 6 * 60 * 1000);
      const windowStart = fourMinLater.toTimeString().slice(0, 8);
      const windowEnd = sixMinLater.toTimeString().slice(0, 8);
      
      // Get today's date in YYYY-MM-DD format
      const todayStr = now.toISOString().split('T')[0];

      logger.debug(`Checking for tee times between ${windowStart} and ${windowEnd} on ${todayStr}`);

      const query = `
        SELECT 
          t.id,
          t.creator_id,
          t.course_name,
          t.course_location,
          t.tee_date,
          t.tee_time,
          t.status,
          t.check_in_reminder_sent
        FROM tee_times t
        WHERE t.status = 'confirmed'
          AND t.check_in_reminder_sent = false
          AND t.tee_date = $1::date
          AND t.tee_time >= $2::time
          AND t.tee_time <= $3::time
      `;
      
      const result = await pool.query(query, [todayStr, windowStart, windowEnd]);
      const teeTimes = result.rows;

      if (teeTimes.length === 0) {
        logger.debug("No tee times found for check-in reminders");
        return { processed: 0 };
      }

      logger.info(`Found ${teeTimes.length} tee times for check-in reminders`);

      let processed = 0;
      for (const teeTime of teeTimes) {
        try {
          // Send notification to organizer
          await notificationService.notifyCheckInReminder(teeTime.creator_id, {
            id: teeTime.id,
            courseName: teeTime.course_name,
            courseLocation: teeTime.course_location,
          });

          // Mark as notified
          await this.markReminderSent(teeTime.id);

          // Transition tee time to in_progress status
          await this.transitionToInProgress(teeTime.id);

          processed++;
          logger.info(`Check-in reminder sent for tee time ${teeTime.id} to organizer ${teeTime.creator_id}`);
        } catch (error) {
          logger.error(`Failed to process check-in reminder for tee time ${teeTime.id}:`, error);
        }
      }

      return { processed };
    } catch (error) {
      logger.error("Error processing upcoming tee times:", error);
      throw error;
    }
  }

  /**
   * Mark tee time as having reminder sent
   */
  async markReminderSent(teeTimeId) {
    const query = `
      UPDATE tee_times 
      SET check_in_reminder_sent = true
      WHERE id = $1
    `;
    await pool.query(query, [teeTimeId]);
  }

  /**
   * Transition tee time to in_progress status
   */
  async transitionToInProgress(teeTimeId) {
    const query = `
      UPDATE tee_times 
      SET status = 'in_progress', check_in_started_at = NOW()
      WHERE id = $1 AND status = 'confirmed'
    `;
    await pool.query(query, [teeTimeId]);
  }

  /**
   * Initialize attendance records for a tee time
   * Called when tee time transitions to in_progress
   */
  async initializeAttendance(teeTimeId) {
    try {
      // Get all participants
      const participantsQuery = `
        SELECT id, user_id FROM tee_time_participants 
        WHERE tee_time_id = $1 AND (status IS NULL OR status != 'cancelled')
      `;
      const participantsResult = await pool.query(participantsQuery, [teeTimeId]);

      // Create attendance records for each participant
      for (const participant of participantsResult.rows) {
        const insertQuery = `
          INSERT INTO tee_time_attendance (tee_time_id, participant_id, user_id, status)
          VALUES ($1, $2, $3, 'pending')
          ON CONFLICT (tee_time_id, participant_id) DO NOTHING
        `;
        await pool.query(insertQuery, [teeTimeId, participant.id, participant.user_id]);
      }

      logger.info(`Initialized attendance for tee time ${teeTimeId} with ${participantsResult.rows.length} participants`);
    } catch (error) {
      logger.error(`Failed to initialize attendance for tee time ${teeTimeId}:`, error);
    }
  }
}

module.exports = new CheckInReminderService();
