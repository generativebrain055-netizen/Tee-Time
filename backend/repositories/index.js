/**
 * Repositories Index
 * Re-exports all repositories for cleaner imports
 *
 * Repositories follow the Repository Pattern to abstract
 * database operations from business logic.
 */

const authProviderRepository = require("./authProviderRepository");
const courseRepository = require("./courseRepository");
const deviceRepository = require("./deviceRepository");
const friendRepository = require("./friendRepository");
const inviteRepository = require("./inviteRepository");
const inviteResponseRepository = require("./inviteResponseRepository");
const magicLinkRepository = require("./magicLinkRepository");
const otpRepository = require("./otpRepository");
const profileRepository = require("./profileRepository");
const rosterRepository = require("./rosterRepository");
const sessionRepository = require("./sessionRepository");
const teeTimeRepository = require("./teeTimeRepository");
const userRepository = require("./userRepository");

module.exports = {
  authProviderRepository,
  courseRepository,
  deviceRepository,
  friendRepository,
  inviteRepository,
  inviteResponseRepository,
  magicLinkRepository,
  otpRepository,
  profileRepository,
  rosterRepository,
  sessionRepository,
  teeTimeRepository,
  userRepository,
};
