/**
 * User Response Formatter
 * Transforms database records into API response format
 * @module formatters/userFormatter
 */

/**
 * Format user for API response (standard fields)
 * @param {Object} user - User database record
 * @returns {Object} Formatted user object
 */
const formatUser = (user) => ({
  id: user.id,
  phoneNumber: user.phone_number || null,
  email: user.email || null,
  username: user.username || null,
  firstName: user.first_name || null,
  lastName: user.last_name || null,
  handicap: user.handicap || null,
  socialRate: user.social_rate || null,
  location: user.location || null,
  homeCourse: user.home_course || null,
});

/**
 * Format user for session response (includes profile status)
 * @param {Object} user - User database record
 * @param {Object} profileStatus - Profile completeness status
 * @returns {Object} Formatted user with profile status
 */
const formatUserWithProfileStatus = (user, profileStatus) => ({
  ...formatUser(user),
  needsOnboarding: profileStatus.needsOnboarding,
  missingFields: profileStatus.missingFields,
  profileIncomplete: !profileStatus.isComplete,
});

/**
 * Format user for public display (limited fields)
 * @param {Object} user - User database record
 * @returns {Object} Formatted user with public fields only
 */
const formatUserPublic = (user) => ({
  id: user.id,
  username: user.username || null,
  firstName: user.first_name || null,
  lastName: user.last_name || null,
  handicap: user.handicap || null,
  socialRate: user.social_rate || null,
});

/**
 * Format user for friend list
 * @param {Object} user - User database record with friendship data
 * @returns {Object} Formatted friend
 */
const formatFriend = (user) => ({
  id: user.id,
  firstName: user.first_name || null,
  lastName: user.last_name || null,
  username: user.username || null,
  handicap: user.handicap || null,
  socialRate: user.social_rate || null,
  avatarUrl: user.avatar_url || null,
});

module.exports = {
  formatUser,
  formatUserWithProfileStatus,
  formatUserPublic,
  formatFriend,
};
