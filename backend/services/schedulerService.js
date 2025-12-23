const checkInReminderService = require("./checkInReminderService");
const logger = require("../config/logger");

/**
 * Scheduler Service
 * Runs periodic tasks within the server process
 */
class SchedulerService {
  constructor() {
    this.intervals = [];
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    logger.info("Starting scheduler service...");

    // Check-in reminders - run every minute
    const checkInInterval = setInterval(async () => {
      try {
        await checkInReminderService.processUpcomingTeeTimes();
      } catch (error) {
        logger.error("Scheduled check-in reminder processing failed:", error);
      }
    }, 60 * 1000); // Every 60 seconds

    this.intervals.push(checkInInterval);

    // Run immediately on startup
    checkInReminderService.processUpcomingTeeTimes().catch(err => {
      logger.error("Initial check-in reminder processing failed:", err);
    });

    logger.info("Scheduler service started - check-in reminders running every minute");
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    logger.info("Stopping scheduler service...");
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }
}

module.exports = new SchedulerService();
