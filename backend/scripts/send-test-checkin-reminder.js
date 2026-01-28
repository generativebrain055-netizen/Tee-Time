#!/usr/bin/env node
/**
 * Manually send check-in reminder for testing
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { pool } = require("../config/database");
const notificationService = require("../services/notificationService");
const logger = require("../config/logger");

async function main() {
  try {
    // Find confirmed tee times for today that haven't had reminders sent
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
        AND t.tee_date = CURRENT_DATE
      ORDER BY t.tee_time
    `;
    
    const result = await pool.query(query);
    const teeTimes = result.rows;

    if (teeTimes.length === 0) {
      console.log("No confirmed tee times found for today that need reminders");
      process.exit(0);
    }

    console.log(`Found ${teeTimes.length} tee time(s) to send reminders for:`);
    
    for (const teeTime of teeTimes) {
      console.log(`\nSending reminder for: ${teeTime.course_name} at ${teeTime.tee_time}`);
      
      // Send notification to organizer
      await notificationService.notifyCheckInReminder(teeTime.creator_id, {
        id: teeTime.id,
        courseName: teeTime.course_name,
        courseLocation: teeTime.course_location,
      });

      // Mark as notified
      await pool.query(
        `UPDATE tee_times SET check_in_reminder_sent = true WHERE id = $1`,
        [teeTime.id]
      );

      // Transition to in_progress
      await pool.query(
        `UPDATE tee_times SET status = 'in_progress', check_in_started_at = NOW() WHERE id = $1 AND status = 'confirmed'`,
        [teeTime.id]
      );

      console.log(`✓ Reminder sent and tee time transitioned to in_progress`);
    }

    console.log("\nDone!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
