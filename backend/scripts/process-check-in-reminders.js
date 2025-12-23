#!/usr/bin/env node
/**
 * Process Check-In Reminders
 * 
 * This script should be run every minute via cron to send check-in reminders
 * to organizers 5 minutes before their tee times.
 * 
 * Usage: node scripts/process-check-in-reminders.js
 * 
 * Cron example (every minute):
 * * * * * * cd /path/to/backend && node scripts/process-check-in-reminders.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const checkInReminderService = require("../services/checkInReminderService");
const logger = require("../config/logger");

async function main() {
  try {
    logger.info("Starting check-in reminder processing...");
    
    const result = await checkInReminderService.processUpcomingTeeTimes();
    
    logger.info(`Check-in reminder processing complete. Processed: ${result.processed}`);
    process.exit(0);
  } catch (error) {
    logger.error("Check-in reminder processing failed:", error);
    process.exit(1);
  }
}

main();
