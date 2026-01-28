#!/usr/bin/env node
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const checkInReminderService = require("../services/checkInReminderService");

async function main() {
  console.log("Manually triggering check-in reminder service...");
  console.log("Current time:", new Date().toTimeString().slice(0, 8));
  
  try {
    const result = await checkInReminderService.processUpcomingTeeTimes();
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

main();
