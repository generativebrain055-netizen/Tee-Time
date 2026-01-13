const { supabaseAdmin } = require("../config/supabase");
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
      const now = new Date();
      
      // Calculate 4 and 6 minutes from now
      const fourMinLater = new Date(now.getTime() + 4 * 60 * 1000);
      const sixMinLater = new Date(now.getTime() + 6 * 60 * 1000);
      const windowStart = fourMinLater.toTimeString().slice(0, 8);
      const windowEnd = sixMinLater.toTimeString().slice(0, 8);
      
      // Get today's date in YYYY-MM-DD format
      const todayStr = now.toISOString().split('T')[0];

      logger.debug(`Checking for tee times between ${windowStart} and ${windowEnd} on ${todayStr}`);

      const { data: teeTimes, error } = await supabaseAdmin
        .from("tee_times")
        .select("*")
        .eq("status", "confirmed")
        .eq("check_in_reminder_sent", false)
        .eq("tee_date", todayStr)
        .gte("tee_time", windowStart)
        .lte("tee_time", windowEnd);

      if (error) {
        logger.error("Error fetching upcoming tee times:", error.message);
        throw error;
      }

      if (!teeTimes || teeTimes.length === 0) {
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
          logger.error(`Failed to process check-in reminder for tee time ${teeTime.id}:`, error.message);
        }
      }

      return { processed };
    } catch (error) {
      logger.error("Error processing upcoming tee times:", error.message);
      throw error;
    }
  }

  /**
   * Mark tee time as having reminder sent
   */
  async markReminderSent(teeTimeId) {
    const { error } = await supabaseAdmin
      .from("tee_times")
      .update({ check_in_reminder_sent: true })
      .eq("id", teeTimeId);

    if (error) {
      logger.error(`Error marking reminder sent for tee time ${teeTimeId}:`, error.message);
      throw error;
    }
  }

  /**
   * Transition tee time to in_progress status
   */
  async transitionToInProgress(teeTimeId) {
    const { error } = await supabaseAdmin
      .from("tee_times")
      .update({ 
        status: "in_progress",
        check_in_started_at: new Date().toISOString()
      })
      .eq("id", teeTimeId)
      .eq("status", "confirmed");

    if (error) {
      logger.error(`Error transitioning tee time ${teeTimeId} to in_progress:`, error.message);
      throw error;
    }
  }

  /**
   * Initialize attendance records for a tee time
   * Called when tee time transitions to in_progress
   */
  async initializeAttendance(teeTimeId) {
    try {
      // Get all participants
      const { data: participants, error: participantsError } = await supabaseAdmin
        .from("tee_time_participants")
        .select("id, user_id")
        .eq("tee_time_id", teeTimeId)
        .or("status.is.null,status.neq.cancelled");

      if (participantsError) {
        logger.error(`Error fetching participants for tee time ${teeTimeId}:`, participantsError.message);
        throw participantsError;
      }

      // Create attendance records for each participant
      const attendanceRecords = participants.map(p => ({
        tee_time_id: teeTimeId,
        participant_id: p.id,
        user_id: p.user_id,
        status: "pending"
      }));

      const { error: insertError } = await supabaseAdmin
        .from("tee_time_attendance")
        .upsert(attendanceRecords, {
          onConflict: "tee_time_id,participant_id",
          ignoreDuplicates: true
        });

      if (insertError) {
        logger.error(`Error initializing attendance for tee time ${teeTimeId}:`, insertError.message);
        throw insertError;
      }

      logger.info(`Initialized attendance for tee time ${teeTimeId} with ${participants.length} participants`);
    } catch (error) {
      logger.error(`Failed to initialize attendance for tee time ${teeTimeId}:`, error.message);
    }
  }
}

module.exports = new CheckInReminderService();
