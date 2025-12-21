/**
 * Process Expired Roster Invites
 * 
 * This script should be run periodically (e.g., every 5 minutes via cron)
 * to handle expired roster invites and trigger the next person in queue.
 * 
 * Usage: node scripts/process-expired-invites.js
 * 
 * Cron example (every 5 minutes):
 * */5 * * * * cd /path/to/backend && node scripts/process-expired-invites.js
 */

require('dotenv').config();
const { pool } = require('../config/database');
const logger = require('../config/logger');

async function processExpiredInvites() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting expired invite processing...');
    
    // Find all expired pending invites for roster-type tee times
    const expiredQuery = `
      SELECT i.*, tt.invite_type, tt.max_players, tt.id as tee_time_id
      FROM invites i
      JOIN tee_times tt ON i.tee_time_id = tt.id
      WHERE i.status = 'pending'
        AND i.expires_at IS NOT NULL
        AND i.expires_at < NOW()
        AND tt.invite_type = 'roster'
        AND tt.status IN ('pending', 'confirmed')
    `;
    
    const expiredResult = await client.query(expiredQuery);
    const expiredInvites = expiredResult.rows;
    
    logger.info(`Found ${expiredInvites.length} expired roster invites`);
    
    for (const invite of expiredInvites) {
      await client.query('BEGIN');
      
      try {
        // Mark as expired
        await client.query(
          `UPDATE invites SET status = 'expired', updated_at = NOW() WHERE id = $1`,
          [invite.id]
        );
        
        // Check if tee time still needs players
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM tee_time_participants WHERE tee_time_id = $1`,
          [invite.tee_time_id]
        );
        const participantCount = parseInt(countResult.rows[0].count);
        
        if (participantCount < invite.max_players) {
          // Find next pending invite without expiry
          const nextQuery = `
            SELECT * FROM invites
            WHERE tee_time_id = $1
              AND status = 'pending'
              AND expires_at IS NULL
            ORDER BY position ASC
            LIMIT 1
          `;
          const nextResult = await client.query(nextQuery, [invite.tee_time_id]);
          
          if (nextResult.rows.length > 0) {
            const nextInvite = nextResult.rows[0];
            // Default 2 hour window - could be stored in tee_time
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
            
            await client.query(
              `UPDATE invites SET expires_at = $1, updated_at = NOW() WHERE id = $2`,
              [expiresAt, nextInvite.id]
            );
            
            logger.info(`Activated next invite ${nextInvite.id} for tee time ${invite.tee_time_id}`);
            
            // TODO: Send notification to next invitee
            // This would require importing the invite controller or notification service
          }
        }
        
        await client.query('COMMIT');
        logger.info(`Processed expired invite ${invite.id}`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to process invite ${invite.id}:`, error);
      }
    }
    
    logger.info('Expired invite processing complete');
    
  } catch (error) {
    logger.error('Error processing expired invites:', error);
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  processExpiredInvites()
    .then(() => {
      logger.info('Script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { processExpiredInvites };
