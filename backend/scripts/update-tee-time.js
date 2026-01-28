#!/usr/bin/env node
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { pool } = require("../config/database");

async function main() {
  const courseName = process.argv[2] || 'MiCasa';
  const newTime = process.argv[3] || '19:30:00';
  
  const result = await pool.query(
    "UPDATE tee_times SET tee_time = $1, check_in_reminder_sent = false WHERE course_name = $2",
    [newTime, courseName]
  );
  
  console.log(`Updated ${courseName} tee time to ${newTime}. Rows affected:`, result.rowCount);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
