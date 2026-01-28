/**
 * Controllers Index
 * Re-exports all controllers for cleaner imports
 */

const attendanceController = require("./attendanceController");
const authController = require("./authController");
const courseController = require("./courseController");
const draftController = require("./draftController");
const friendController = require("./friendController");
const notificationController = require("./notificationController");
const rosterController = require("./rosterController");
const socialRateController = require("./socialRateController");
const teeTimeController = require("./teeTimeController");

// Sub-module controllers
const authModules = require("./auth");
const inviteModules = require("./invite");

module.exports = {
  attendanceController,
  authController,
  courseController,
  draftController,
  friendController,
  notificationController,
  rosterController,
  socialRateController,
  teeTimeController,
  // Sub-modules
  auth: authModules,
  invite: inviteModules,
};
