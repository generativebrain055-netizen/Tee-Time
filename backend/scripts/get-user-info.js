require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function run() {
    try {
        // Get users
        const users = await pool.query('SELECT id, first_name, last_name, phone_number FROM users LIMIT 5');
        console.log('Users:');
        users.rows.forEach(u => console.log(u.id, '-', u.first_name, u.last_name, '-', u.phone_number));
        
        // Get recent tee times
        const teeTimes = await pool.query('SELECT id, creator_id, course_name, tee_date, status FROM tee_times ORDER BY created_at DESC LIMIT 5');
        console.log('\nRecent Tee Times:');
        teeTimes.rows.forEach(t => console.log(t.id, '-', t.course_name, '-', t.tee_date, '-', t.status));
        
        await pool.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
