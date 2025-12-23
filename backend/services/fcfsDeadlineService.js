const inviteRepository = require("../repositories/inviteRepository");
const notificationService = require("./notificationService");
const logger = require("../config/logger");

/**
 * FCFS Deadline Service
 * Handles expiration of FCFS invites when deadline passes
 */
class FCFSDeadlineService {
  /**
   * Process expired FCFS invites
   * Called periodically by scheduler
   */
  async processExpiredInvites() {
    try {
      // Get and expire all invites past their deadline
      const expiredInvites = await inviteRepository.expireOldInvites();
      
      if (expiredInvites.length > 0) {
        logger.info(`Expired ${expiredInvites.length} FCFS invites past deadline`);
        
        // Group by tee time to send notifications
        const teeTimeIds = [...new Set(expiredInvites.map(i => i.tee_time_id))];
        
        for (const teeTimeId of teeTimeIds) {
          const teeTimeInvites = expiredInvites.filter(i => i.tee_time_id === teeTimeId);
          
          // Notify each user their invite expired
          for (const invite of teeTimeInvites) {
            if (invite.invitee_user_id) {
              try {
                await notificationService.createNotification({
                  userId: invite.invitee_user_id,
                  title: 'Invite Expired',
                  body: 'The deadline to respond has passed. The spot may have been filled.',
                  data: {
                    type: 'invite_expired',
                    teeTimeId: invite.tee_time_id,
                    inviteId: invite.id
                  }
                });
              } catch (notifyError) {
                logger.error(`Failed to notify user ${invite.invitee_user_id} of expired invite:`, notifyError);
              }
            }
          }
        }
      }
      
      return expiredInvites.length;
    } catch (error) {
      // Don't throw on connection errors - just log and continue
      if (error.message?.includes('timeout') || error.message?.includes('Connection')) {
        logger.warn("FCFS deadline processing skipped - database connection issue");
        return 0;
      }
      logger.error("Process expired FCFS invites error:", error);
      return 0;
    }
  }
}

module.exports = new FCFSDeadlineService();
