const checkInReminderService = require("./checkInReminderService");
const fcfsDeadlineService = require("./fcfsDeadlineService");
const logger = require("../config/logger");

/**
 * Scheduler Service
 * Runs periodic tasks within the server process
 */
class SchedulerService {
  constructor() {
    this.intervals = [];
    this.isStarted = false;
  }

  /**
   * Start all scheduled tasks
   * Delays initial run to ensure database connection is established
   */
  start() {
    if (this.isStarted) {
      logger.warn("Scheduler service already started");
      return;
    }

    this.isStarted = true;
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

    // FCFS deadline service (Adaptive, not interval-based)
    fcfsDeadlineService.start();

    // Delay initial run by 5 seconds to ensure database is ready
    setTimeout(() => {
      checkInReminderService.processUpcomingTeeTimes().catch((err) => {
        logger.error("Initial check-in reminder processing failed:", err);
      });
      // fcfsDeadlineService automatically starts in .start()
    }, 5000);

    logger.info(
      "Scheduler service started - check-in reminders (interval) and FCFS deadlines (adaptive)"
    );
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    logger.info("Stopping scheduler service...");
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];

    // Stop adaptive service
    fcfsDeadlineService.stop();

    this.isStarted = false;
  }
}

module.exports = new SchedulerService();
