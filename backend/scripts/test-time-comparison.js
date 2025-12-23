#!/usr/bin/env node
/**
 * Test time comparison logic
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { pool } = require("../config/database");

async function main() {
  try {
    // Check current times using JavaScript (server local time)
    const now = new Date();
    const localTimeStr = now.toTimeString().slice(0, 8);
    const todayStr = now.toISOString().split('T')[0];
    
    // Calculate 4 and 6 minutes from now
    const fourMinLater = new Date(now.getTime() + 4 * 60 * 1000);
    const sixMinLater = new Date(now.getTime() + 6 * 60 * 1000);
    const windowStart = fourMinLater.toTimeString().slice(0, 8);
    const windowEnd = sixMinLater.toTimeString().slice(0, 8);

    console.log("=== Time Comparison (Using JS Local Time) ===");
    console.log("JS Local Time:", localTimeStr);
    console.log("Today's Date:", todayStr);
    console.log("Window Start (4 min):", windowStart);
    console.log("Window End (6 min):", windowEnd);
    console.log("");

    // Check tee times with the new comparison
    const teeTimesQuery = await pool.query(`
      SELECT 
        t.id,
        t.course_name,
        t.tee_date,
        t.tee_time,
        t.status,
        t.check_in_reminder_sent
      FROM tee_times t
      WHERE t.tee_date = $1::date
      ORDER BY t.tee_time
    `, [todayStr]);

    console.log("=== Today's Tee Times ===");
    teeTimesQuery.rows.forEach(t => {
      const teeTimeStr = t.tee_time;
      const inWindow = teeTimeStr >= windowStart && teeTimeStr <= windowEnd;
      console.log(`\nCourse: ${t.course_name}`);
      console.log(`  Tee Time: ${t.tee_time}`);
      console.log(`  Status: ${t.status}`);
      console.log(`  Reminder Sent: ${t.check_in_reminder_sent}`);
      console.log(`  In 4-6 min window: ${inWindow}`);
    });

    // Check what the scheduler query would return
    const schedulerQuery = await pool.query(`
      SELECT 
        t.id,
        t.course_name,
        t.tee_time,
        t.status,
        t.check_in_reminder_sent
      FROM tee_times t
      WHERE t.status = 'confirmed'
        AND t.check_in_reminder_sent = false
        AND t.tee_date = $1::date
        AND t.tee_time >= $2::time
        AND t.tee_time <= $3::time
    `, [todayStr, windowStart, windowEnd]);

    console.log("\n=== Scheduler Query Results ===");
    if (schedulerQuery.rows.length === 0) {
      console.log("No tee times match the scheduler criteria");
    } else {
      schedulerQuery.rows.forEach(t => {
        console.log(`Would send reminder for: ${t.course_name} at ${t.tee_time}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
