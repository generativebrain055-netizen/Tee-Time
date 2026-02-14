/**
 * Invite Management Service
 * Handles complex invite workflows including:
 * - Auto-reinvite when player cancels
 * - Roster exhaustion handling
 * - FCFS spot opening notifications
 */
const inviteRepository = require("../repositories/inviteRepository");
const teeTimeRepository = require("../repositories/teeTimeRepository");
const rosterRepository = require("../repositories/rosterRepository");
const notificationService = require("./notificationService");
const logger = require("../config/logger");
const { sendInviteSms } = require("../controllers/invite/smsService");

class InviteManagementService {
  /**
   * Handle when a confirmed player cancels their participation
   * - Notifies organizer
   * - Auto-sends replacement invite based on invite type
   */
  async handlePlayerCancellation(teeTimeId, cancelledUserId, cancelledUserInfo) {
    try {
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        logger.error(`Tee time ${teeTimeId} not found for cancellation handling`);
        return;
      }

      // Notify organizer about the cancellation
      await notificationService.notifyPlayerCancelled(
        teeTime.creator_id,
        teeTime,
        cancelledUserInfo
      );

      // Handle based on invite type
      if (teeTime.invite_type === 'roster') {
        await this.handleRosterCancellation(teeTime);
      } else if (teeTime.invite_type === 'fcfs') {
        await this.handleFCFSCancellation(teeTime);
      }

      logger.info(`Handled cancellation for tee time ${teeTimeId}, user ${cancelledUserId}`);
    } catch (error) {
      logger.error("Handle player cancellation error:", error);
    }
  }

  /**
   * Handle roster-type cancellation
   * Continue sending invites in roster order
   */
  async handleRosterCancellation(teeTime) {
    const responseWindow = teeTime.response_window || 2;
    const nextInvite = await inviteRepository.getNextPendingInvite(teeTime.id);

    if (nextInvite) {
      // Activate next invite in roster order
      const responseWindowMs = responseWindow * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + responseWindowMs);
      await inviteRepository.activateInvite(nextInvite.id, expiresAt);

      // Send notification/SMS
      if (nextInvite.invitee_user_id) {
        await notificationService.notifyTeeTimeInvite(
          nextInvite.invitee_user_id,
          {
            id: teeTime.id,
            date: teeTime.tee_date,
            time: teeTime.tee_time,
            courseName: teeTime.course_name,
            maxPlayers: teeTime.max_players,
          },
          {
            id: teeTime.creator_id,
            firstName: teeTime.first_name,
            lastName: teeTime.last_name,
          },
          expiresAt,
          nextInvite.id
        );
      } else if (nextInvite.invitee_phone) {
        await sendInviteSms(nextInvite, teeTime, false, responseWindow);
      }

      logger.info(`Activated next roster invite ${nextInvite.id} after cancellation`);
    } else {
      // No more roster invites - check if we should notify about On-Deck
      await this.checkAndNotifyRosterExhausted(teeTime);
    }
  }

  /**
   * Handle FCFS-type cancellation
   * Notify waitlist and pending invitees that a spot opened
   */
  async handleFCFSCancellation(teeTime) {
    const organizer = {
      id: teeTime.creator_id,
      firstName: teeTime.first_name,
      lastName: teeTime.last_name,
    };

    // Get waitlist users and notify them
    const waitlistUsers = await inviteRepository.getWaitlistUsersForNotification(teeTime.id);
    
    // Reactivate waitlist invites as pending
    if (waitlistUsers.length > 0) {
      await inviteRepository.reactivateWaitlistInvites(teeTime.id);
    }

    // Notify all waitlist users that a spot opened
    for (const user of waitlistUsers) {
      if (user.invitee_user_id) {
        await notificationService.notifySpotOpened(user.invitee_user_id, teeTime, organizer);
      } else if (user.invitee_phone) {
        // Send SMS for non-app users
        await sendInviteSms(
          { id: user.id, invitee_phone: user.invitee_phone, invitee_name: user.invitee_name },
          teeTime,
          true // FCFS style message
        );
      }
    }

    // Also notify pending invitees who haven't responded yet
    const pendingUsers = await inviteRepository.getPendingInviteUsers(teeTime.id);
    for (const user of pendingUsers) {
      if (user.invitee_user_id) {
        await notificationService.notifySpotOpened(user.invitee_user_id, teeTime, organizer);
      }
    }

    logger.info(`Notified ${waitlistUsers.length} waitlist + ${pendingUsers.length} pending users about spot opening`);
  }

  /**
   * Check if roster is exhausted and notify organizer to use On-Deck
   */
  async checkAndNotifyRosterExhausted(teeTime) {
    const participantCount = await teeTimeRepository.getParticipantCount(teeTime.id);
    const spotsRemaining = teeTime.max_players - participantCount;

    if (spotsRemaining > 0) {
      // Check if there are any pending invites left
      const inviteStatus = await inviteRepository.checkAllInvitesResponded(teeTime.id);
      
      if (inviteStatus.pendingCount === 0) {
        // Roster exhausted - notify organizer
        await notificationService.notifyRosterExhausted(
          teeTime.creator_id,
          teeTime,
          spotsRemaining
        );
        logger.info(`Notified organizer ${teeTime.creator_id} about roster exhaustion for tee time ${teeTime.id}`);
      }
    }
  }

  /**
   * Send On-Deck invites as FCFS
   * Called when organizer selects On-Deck players to fill remaining spots
   */
  async sendOnDeckInvites(teeTimeId, organizerId, onDeckPlayerIds, deadline = null) {
    try {
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime || teeTime.creator_id !== organizerId) {
        throw new Error("Not authorized");
      }

      // Get on-deck player details
      const onDeckPlayers = await rosterRepository.getOnDeck(organizerId);
      const selectedPlayers = onDeckPlayers.filter(p => 
        onDeckPlayerIds.includes(p.id) || onDeckPlayerIds.includes(p.contact_user_id)
      );

      if (selectedPlayers.length === 0) {
        throw new Error("No valid On-Deck players selected");
      }

      // Create FCFS invites for selected On-Deck players
      const invitees = selectedPlayers.map((p, idx) => ({
        userId: p.contact_user_id,
        phone: p.contact_phone,
        name: p.contact_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        position: idx,
        expiresAt: deadline,
      }));

      const createdInvites = await inviteRepository.createBulkInvitesWithExpiry(
        teeTimeId,
        organizerId,
        invitees
      );

      // Send notifications to all On-Deck players (FCFS style)
      for (const invite of createdInvites) {
        if (invite.invitee_user_id) {
          await notificationService.notifyTeeTimeInvite(
            invite.invitee_user_id,
            {
              id: teeTime.id,
              date: teeTime.tee_date,
              time: teeTime.tee_time,
              courseName: teeTime.course_name,
              maxPlayers: teeTime.max_players,
            },
            {
              id: organizerId,
              firstName: teeTime.first_name,
              lastName: teeTime.last_name,
            },
            invite.expires_at || deadline,
            invite.id
          );
        } else if (invite.invitee_phone) {
          await sendInviteSms(invite, teeTime, true); // FCFS message
        }
      }

      logger.info(`Sent ${createdInvites.length} On-Deck FCFS invites for tee time ${teeTimeId}`);
      return createdInvites;
    } catch (error) {
      logger.error("Send On-Deck invites error:", error);
      throw error;
    }
  }

  /**
   * Check tee times approaching deadline and notify if not filled
   */
  async checkDeadlineNotifications() {
    try {
      // Get invites expiring in the next hour that haven't been notified
      const expiringInvites = await inviteRepository.getInvitesExpiringSoon(1);
      
      for (const invite of expiringInvites) {
        if (invite.invitee_user_id) {
          await notificationService.notifyFCFSDeadlineApproaching(
            invite.invitee_user_id,
            invite,
            1
          );
          await inviteRepository.markDeadlineNotificationSent(invite.id);
        }
      }

      logger.info(`Sent ${expiringInvites.length} deadline approaching notifications`);
    } catch (error) {
      logger.error("Check deadline notifications error:", error);
    }
  }

  /**
   * Process expired invites and check if tee time needs On-Deck
   */
  async processExpiredInvites() {
    try {
      // Expire old invites
      const expiredInvites = await inviteRepository.expireOldInvites();
      
      // Group by tee time to check each one
      const teeTimeIds = [...new Set(expiredInvites.map(i => i.tee_time_id))];
      
      for (const teeTimeId of teeTimeIds) {
        const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
        if (!teeTime) continue;

        if (teeTime.invite_type === 'roster') {
          // For roster: try to activate next invite or notify about On-Deck
          await this.handleRosterCancellation(teeTime);
        } else if (teeTime.invite_type === 'fcfs') {
          // For FCFS: check if tee time is not filled and notify organizer
          const participantCount = await teeTimeRepository.getParticipantCount(teeTimeId);
          const spotsRemaining = teeTime.max_players - participantCount;
          
          if (spotsRemaining > 0) {
            await notificationService.notifyTeeTimeNotFilled(
              teeTime.creator_id,
              teeTime,
              spotsRemaining
            );
          }
        }
      }

      logger.info(`Processed ${expiredInvites.length} expired invites across ${teeTimeIds.length} tee times`);
    } catch (error) {
      logger.error("Process expired invites error:", error);
    }
  }
}

module.exports = new InviteManagementService();
