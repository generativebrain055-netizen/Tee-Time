/**
 * Test script to trigger roster exhausted notification
 * Run with: node backend/scripts/test-roster-exhausted.js <userId> <teeTimeId>
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const notificationService = require('../services/notificationService');
const { pool } = require('../config/database');

async function testRosterExhausted() {
    const userId = process.argv[2];
    const teeTimeId = process.argv[3];
    
    if (!userId) {
        console.log('Usage: node test-roster-exhausted.js <userId> [teeTimeId]');
        console.log('\nThis will create a "Roster Exhausted" notification for the user.');
        process.exit(1);
    }

    try {
        // Create a mock tee time object or fetch real one
        let teeTime;
        if (teeTimeId) {
            const result = await pool.query('SELECT * FROM tee_times WHERE id = $1', [teeTimeId]);
            if (result.rows[0]) {
                teeTime = result.rows[0];
            }
        }
        
        if (!teeTime) {
            // Use mock data
            teeTime = {
                id: teeTimeId || 'test-tee-time-id',
                course_name: 'Test Golf Course',
                tee_date: '2024-12-25',
                tee_time: '10:00:00'
            };
        }

        const spotsRemaining = 2;

        console.log('Creating roster exhausted notification...');
        console.log('User ID:', userId);
        console.log('Tee Time:', teeTime.course_name);
        console.log('Spots Remaining:', spotsRemaining);

        const result = await notificationService.notifyRosterExhausted(
            userId,
            teeTime,
            spotsRemaining
        );

        console.log('\n✅ Notification created:', result);
        console.log('\nCheck the Notifications screen in the app!');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testRosterExhausted();
