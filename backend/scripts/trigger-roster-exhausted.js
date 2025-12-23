require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const notificationService = require('../services/notificationService');
const { pool } = require('../config/database');

async function trigger() {
    const client = await pool.connect();
    try {
        const userId = 'b288f8a4-5fa2-433e-8668-d83ca9788516'; // Usman Ali
        const teeTimeId = 'a27d0a9e-0d7c-4ac5-a980-e2528ef1d243'; // Golf - pending
        
        // Get tee time details
        const result = await client.query('SELECT * FROM tee_times WHERE id = $1', [teeTimeId]);
        const teeTime = result.rows[0];
        
        if (!teeTime) {
            console.log('Tee time not found, using mock data');
        }
        
        const spotsRemaining = 2;
        
        console.log('Creating roster exhausted notification...');
        console.log('User:', userId);
        console.log('Tee Time:', teeTime?.course_name || 'Test Course');
        console.log('Spots Remaining:', spotsRemaining);
        
        const notification = await notificationService.notifyRosterExhausted(
            userId,
            teeTime || { id: teeTimeId, course_name: 'Test Golf Course' },
            spotsRemaining
        );
        
        console.log('\n✅ Notification created!');
        console.log('Notification ID:', notification?.id);
        console.log('\nRefresh the Notifications screen in the app to see it!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

trigger();
