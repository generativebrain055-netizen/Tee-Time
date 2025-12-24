const inviteRepository = require("../repositories/inviteRepository");
const teeTimeRepository = require("../repositories/teeTimeRepository");
const notificationService = require("./notificationService");
const logger = require("../config/logger");

/**
 * FCFS Deadline Service
 * Handles expiration of FCFS invites when deadline passes
 * and notifies organizers when tee times are not filled
 */
class FCFSDeadlineService {
  /**
   * Process expired FCFS invites
   * Called periodically by scheduler
   */
  async processExpiredInvites() {
    try {
      logger.debug("Running FCFS deadline check...");
      
      // Get and expire all invites past their deadline
      const expiredInvites = await inviteRepository.expireOldInvites();
      
      logger.debug(`Found ${expiredInvites.length} expired invites to process`);
      
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
                logger.info(`Notifying user ${invite.invitee_user_id} that their invite expired`);
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

          // Check if tee time is not filled and notify organizer
          await this.checkAndNotifyOrganizerIfNotFilled(teeTimeId);
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

  /**
   * Check if tee time is not filled after invites expired
   * and notify organizer to select from On-Deck
   */
  async checkAndNotifyOrganizerIfNotFilled(teeTimeId) {
    try {
      logger.debug(`Checking if tee time ${teeTimeId} is filled...`);
      
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        logger.debug(`Tee time ${teeTimeId} not found`);
        return;
      }

      logger.debug(`Tee time ${teeTimeId} status: ${teeTime.status}`);

      // Only process if tee time is still active (not cancelled/completed)
      if (teeTime.status === 'cancelled' || teeTime.status === 'completed') {
        logger.debug(`Tee time ${teeTimeId} status is ${teeTime.status}, skipping notification`);
        return;
      }

      const participantCount = await teeTimeRepository.getParticipantCount(teeTimeId);
      const spotsRemaining = teeTime.max_players - participantCount;

      logger.debug(`Tee time ${teeTimeId}: ${participantCount}/${teeTime.max_players} participants, ${spotsRemaining} spots remaining`);

      if (spotsRemaining > 0) {
        // Check if there are any pending invites left
        const pendingInvites = await inviteRepository.getPendingInvitesByTeeTime(teeTimeId);
        
        logger.debug(`Tee time ${teeTimeId} has ${pendingInvites.length} pending invites`);
        
        if (pendingInvites.length === 0) {
          // No pending invites and spots remaining - notify organizer
          logger.info(`Notifying organizer ${teeTime.creator_id} that tee time ${teeTimeId} has ${spotsRemaining} unfilled spots`);
          await notificationService.notifyTeeTimeNotFilled(
            teeTime.creator_id,
            teeTime,
            spotsRemaining
          );
        }
      }
    } catch (error) {
      logger.error(`Error checking tee time ${teeTimeId} fill status:`, error);
    }
  }
}

module.exports = new FCFSDeadlineService();
