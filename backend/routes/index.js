/**
 * Routes Index
 * Re-exports all route modules for cleaner imports
 */

const attendanceRoutes = require("./attendance");
const authRoutes = require("./auth");
const coursesRoutes = require("./courses");
const draftRoutes = require("./draft");
const friendsRoutes = require("./friends");
const invitesRoutes = require("./invites");
const notificationsRoutes = require("./notifications");
const rosterRoutes = require("./roster");
const socialRateRoutes = require("./socialRate");
const teeTimesRoutes = require("./teeTimes");

module.exports = {
  attendanceRoutes,
  authRoutes,
  coursesRoutes,
  draftRoutes,
  friendsRoutes,
  invitesRoutes,
  notificationsRoutes,
  rosterRoutes,
  socialRateRoutes,
  teeTimesRoutes,
};
