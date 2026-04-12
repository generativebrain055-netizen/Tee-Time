const inviteRepository = require("../repositories/inviteRepository");
const teeTimeRepository = require("../repositories/teeTimeRepository");
const notificationService = require("./notificationService");
const logger = require("../config/logger");
const organizerPipelineNudgeService = require("./organizerPipelineNudgeService");
const { processNextRosterInvite } = require("../controllers/invite/handlers/responseHandlers");

/**
 * Invite Deadline Service
 * Handles expiration of invites (both FCFS and Roster) when deadline passes
 * and notifies organizers to select from On-Deck
 */
class FCFSDeadlineService {
  constructor() {
    this.timer = null;
    this.loopCheckInterval = 30 * 60 * 1000; // 30 minutes fallback
    this.loopTimer = null;
  }

  /**
   * Start the smart scheduler
   */
  start() {
    logger.info("Starting optimized invite deadline service...");
    this.scheduleNextCheck();

    // Safety net: check periodically just in case
    this.loopTimer = setInterval(() => {
      this.scheduleNextCheck();
    }, this.loopCheckInterval);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    if (this.loopTimer) clearInterval(this.loopTimer);
    logger.info("Invite deadline service stopped");
  }

  /**
   * Called when a new invite is created to potentially wake up sooner
   */
  triggerUpdate() {
    this.scheduleNextCheck();
  }

  /**
   * Find the next event (expiry OR warning) and set a timer for it.
   * This eliminates constant DB polling.
   */
  async scheduleNextCheck() {
    try {
      // 1. Process any currently due events immediately (catch-up)
      await this.processDueEvents();

      // 2. Find next event time (either expiry or 5m warning)
      const nextEventTimeStr = await inviteRepository.getNextNotificationTime();

      if (!nextEventTimeStr) {
        logger.debug(
          "No pending invites or warnings found. Sleeping until new invite created or safety check."
        );
        return;
      }

      const nextEvent = new Date(nextEventTimeStr);
      const now = new Date();
      let delay = nextEvent.getTime() - now.getTime();

      // Add small buffer (1s) to ensure DB time passes
      delay += 1000;

      if (delay < 0) delay = 0;

      logger.info(
        `Next scheduler wake-up in ${(delay / 1000).toFixed(
          1
        )}s at ${nextEvent.toISOString()}`
      );

      // Reset timer
      if (this.timer) clearTimeout(this.timer);

      this.timer = setTimeout(() => {
        this.scheduleNextCheck();
      }, delay);
    } catch (error) {
      logger.error("Error scheduling next invite check:", error);
      // Retry in 1 minute on error
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.scheduleNextCheck(), 60000);
    }
  }

  /**
   * Process all due events:
   * 1. Expire invites past deadline
   * 2. Mark warnings as sent
   * 3. Send organizer fill warnings (NEW)
   * Then send notifications for both groups.
   */
  async processDueEvents() {
    try {
      // NEW: Process organizer fill warnings FIRST (before deadline expires)
      await this.processOrganizerFillWarnings();

      // Atomic processing in repository
      // Returns { expired: [], warnings: [] }
      const results = await inviteRepository.processDueNotifications();

      const expiredInvites =
        results.expirations || results.expired || [];
      const warningInvites = results.warnings || [];

      if (expiredInvites.length > 0 || warningInvites.length > 0) {
        logger.info(
          `Processed events: ${expiredInvites.length} expired, ${warningInvites.length} warnings`
        );
      }

      // --- HANDLE 5-MINUTE WARNINGS ---
      for (const invite of warningInvites) {
        if (invite.invitee_user_id) {
          try {
            logger.info(
              `Sending 5-min warning to user ${invite.invitee_user_id} for invite ${invite.id}`
            );
            await notificationService.createNotification({
              userId: invite.invitee_user_id,
              title: "Act Fast!",
              body: "Your invite expires in 5 minutes.",
              data: {
                type: "invite_warning",
                teeTimeId: invite.tee_time_id,
                inviteId: invite.id,
              },
            });
          } catch (err) {
            logger.error(
              `Failed to send warning to ${invite.invitee_user_id}:`,
              err
            );
          }
        }
      }

      // --- HANDLE EXPIRATIONS ---
      if (expiredInvites.length > 0) {
        logger.info(`Expired ${expiredInvites.length} invites past deadline`);

        // Group by tee time to send notifications
        const teeTimeIds = [
          ...new Set(expiredInvites.map((i) => i.tee_time_id)),
        ];

        for (const teeTimeId of teeTimeIds) {
          const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
          if (!teeTime) continue;

          const teeTimeInvites = expiredInvites.filter(
            (i) => i.tee_time_id === teeTimeId
          );

          await notificationService.removeInAppNotificationsForExpiredInvites(
            teeTimeInvites,
          );

          // Notify each user their invite expired
          for (const invite of teeTimeInvites) {
            if (invite.invitee_user_id) {
              try {
                logger.info(
                  `Notifying user ${invite.invitee_user_id} that their invite expired`
                );
                await notificationService.createNotification({
                  userId: invite.invitee_user_id,
                  title: "Invite Expired",
                  body: "The deadline to respond has passed. The spot may have been filled.",
                  data: {
                    type: "invite_expired",
                    teeTimeId: invite.tee_time_id,
                    inviteId: invite.id,
                  },
                });
              } catch (notifyError) {
                logger.error(
                  `Failed to notify user ${invite.invitee_user_id} of expired invite:`,
                  notifyError
                );
              }
            }
          }

          if (teeTime.invite_type === "roster") {
            const responseWindow = teeTime.response_window || 2;
            await processNextRosterInvite(teeTimeId, responseWindow);
          }

          // For both FCFS and Roster: check if tee time is not filled and notify organizer
          // This gives organizer the option to select from On-Deck
          await this.checkAndNotifyOrganizerIfNotFilled(
            teeTimeId,
            teeTime.invite_type
          );
        }
      }
    } catch (error) {
      // Don't throw on connection errors - just log and continue
      if (
        error.message?.includes("timeout") ||
        error.message?.includes("Connection")
      ) {
        logger.warn(
          "Invite deadline processing skipped - database connection issue"
        );
        return;
      }
      logger.error("Error processing due events:", error);
    }
  }

  /**
   * Check if tee time is not filled after invites expired
   * and notify organizer to select from On-Deck
   */
  async checkAndNotifyOrganizerIfNotFilled(teeTimeId, inviteType) {
    try {
      logger.debug(
        `Pipeline nudge check for tee time ${teeTimeId} (${inviteType})...`
      );
      await organizerPipelineNudgeService.maybeNotifyOrganizerInsufficientPipeline(
        teeTimeId
      );
    } catch (error) {
      logger.error(`Error checking tee time ${teeTimeId} fill status:`, error);
    }
  }

  /**
   * NEW: Process organizer fill warnings BEFORE deadline expires
   * This notifies organizers when they have unfilled spots and deadline is approaching
   */
  async processOrganizerFillWarnings() {
    try {
      // Get tee times needing organizer warning (2 min buffer for testing)
      const teeTimesNeedingWarning =
        await inviteRepository.getTeeTimesNeedingOrganizerWarning(2);

      if (teeTimesNeedingWarning.length === 0) {
        return;
      }

      logger.info(
        `Processing ${teeTimesNeedingWarning.length} organizer fill warnings`
      );

      for (const teeTime of teeTimesNeedingWarning) {
        try {
          // Check if there are actually unfilled spots
          const participantCount = await teeTimeRepository.getParticipantCount(
            teeTime.id
          );
          const spotsRemaining = teeTime.max_players - participantCount;

          if (spotsRemaining > 0) {
            logger.info(
              `Sending fill warning to organizer ${teeTime.creator_id} for tee time ${teeTime.id} - ${spotsRemaining} spots remaining, deadline approaching`
            );

            // Send the pre-deadline warning notification
            await notificationService.notifyOrganizerFillWarning(
              teeTime.creator_id,
              teeTime,
              spotsRemaining
            );

            // Mark as sent
            await inviteRepository.markOrganizerFillWarningSent(teeTime.id);
          } else {
            // Tee time is actually filled, just mark the warning as sent
            await inviteRepository.markOrganizerFillWarningSent(teeTime.id);
          }
        } catch (err) {
          logger.error(
            `Failed to process organizer fill warning for tee time ${teeTime.id}:`,
            err
          );
        }
      }
    } catch (error) {
      logger.error("Error processing organizer fill warnings:", error);
    }
  }
}

module.exports = new FCFSDeadlineService();
