require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const { pool } = require("../config/database");

async function main() {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        course_name, 
        tee_date, 
        tee_time, 
        status, 
        check_in_reminder_sent,
        (tee_date + tee_time) as tee_datetime,
        NOW() as current_time,
        EXTRACT(EPOCH FROM ((tee_date + tee_time) - NOW())) / 60 as minutes_until
      FROM tee_times 
      WHERE tee_date = CURRENT_DATE 
      ORDER BY tee_time
    `);
    
    console.log("Today's tee times:");
    result.rows.forEach(t => {
      console.log(`- ${t.course_name}: ${t.tee_time} | Status: ${t.status} | Reminder sent: ${t.check_in_reminder_sent} | Minutes until: ${Math.round(t.minutes_until)}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
