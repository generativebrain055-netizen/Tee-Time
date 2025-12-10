const { query, getClient } = require("../config/database");

/**
 * User Repository
 * Handles all database operations related to users
 */

/**
 * Find user by phone number
 * @param {string} phoneNumber
 * @returns {Promise<Object|null>}
 */
const findByPhoneNumber = async (phoneNumber) => {
  const result = await query(
    `SELECT id, phone_number, email, password_hash, is_active, is_verified, 
            is_locked, locked_until, failed_login_attempts, 
            first_name, last_name, avatar_url,
            notification_preferences, timezone, language,
            last_login_at, last_login_ip, created_at, updated_at
     FROM users 
     WHERE phone_number = $1 AND deleted_at IS NULL 
     LIMIT 1`,
    [phoneNumber]
  );
  return result.rows[0] || null;
};

/**
 * Find user by email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
const findByEmail = async (email) => {
  const result = await query(
    `SELECT id, phone_number, email, password_hash, is_active, is_verified, 
            is_locked, locked_until, failed_login_attempts,
            first_name, last_name, avatar_url,
            notification_preferences, timezone, language,
            last_login_at, last_login_ip, created_at, updated_at
     FROM users 
     WHERE email = $1 AND deleted_at IS NULL 
     LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
};

/**
 * Find user by ID
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findById = async (userId) => {
  const result = await query(
    `SELECT id, phone_number, email, is_active, is_verified, 
            is_locked, locked_until, failed_login_attempts,
            first_name, last_name, avatar_url,
            notification_preferences, timezone, language,
            last_login_at, last_login_ip, last_login_device_id,
            created_at, updated_at
     FROM users 
     WHERE id = $1 AND deleted_at IS NULL 
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

/**
 * Find user by username
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
const findByUsername = async (username) => {
  const result = await query(
    `SELECT id, phone_number, email, username, password_hash, is_active, is_verified, 
            is_locked, locked_until, failed_login_attempts,
            first_name, last_name, handicap, social_rate, avatar_url,
            notification_preferences, timezone, language,
            last_login_at, last_login_ip, created_at, updated_at
     FROM users 
     WHERE username = $1 AND deleted_at IS NULL 
     LIMIT 1`,
    [username]
  );
  return result.rows[0] || null;
};

/**
 * Create a new user
 * @param {Object} userData
 * @returns {Promise<Object>}
 */
const create = async (userData) => {
  const {
    phoneNumber,
    email,
    username,
    firstName,
    lastName,
    handicap,
    passwordHash,
    isVerified,
  } = userData;

  const result = await query(
    `INSERT INTO users (
      phone_number, email, username, first_name, last_name, handicap, password_hash, is_verified
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, phone_number, email, username, first_name, last_name, handicap, social_rate, is_verified, created_at`,
    [
      phoneNumber || null,
      email || null,
      username || null,
      firstName || null,
      lastName || null,
      handicap ? parseInt(handicap) : null,
      passwordHash || null,
      isVerified || false,
    ]
  );

  return result.rows[0];
};

/**
 * Update user password
 * @param {string} userId
 * @param {string} passwordHash
 * @returns {Promise<Object>}
 */
const updatePassword = async (userId, passwordHash) => {
  const result = await query(
    `UPDATE users 
     SET password_hash = $1, updated_at = NOW() 
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id, phone_number, email`,
    [passwordHash, userId]
  );
  return result.rows[0];
};

/**
 * Update user profile
 * @param {string} userId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
const updateProfile = async (userId, updates) => {
  const allowedFields = [
    "first_name",
    "last_name",
    "email",
    "avatar_url",
    "timezone",
    "language",
  ];

  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(updates).forEach((key) => {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (allowedFields.includes(snakeKey)) {
      fields.push(`${snakeKey} = $${paramIndex++}`);
      values.push(updates[key]);
    }
  });

  if (fields.length === 0) {
    throw new Error("No valid fields to update");
  }

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await query(
    `UPDATE users 
     SET ${fields.join(", ")} 
     WHERE id = $${paramIndex} AND deleted_at IS NULL
     RETURNING id, phone_number, email, first_name, last_name, 
               avatar_url, timezone, language, updated_at`,
    values
  );

  return result.rows[0];
};

/**
 * Update last login information
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} deviceId
 * @returns {Promise<void>}
 */
const updateLastLogin = async (userId, ipAddress, deviceId) => {
  await query(
    `UPDATE users 
     SET last_login_at = NOW(), 
         last_login_ip = $1,
         last_login_device_id = $2,
         failed_login_attempts = 0
     WHERE id = $3`,
    [ipAddress, deviceId, userId]
  );
};

/**
 * Increment failed login attempts
 * @param {string} userId
 * @returns {Promise<number>} New count of failed attempts
 */
const incrementFailedLoginAttempts = async (userId) => {
  const result = await query(
    `UPDATE users 
     SET failed_login_attempts = failed_login_attempts + 1,
         is_locked = CASE 
           WHEN failed_login_attempts + 1 >= 5 THEN true 
           ELSE is_locked 
         END,
         locked_until = CASE 
           WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
           ELSE locked_until 
         END
     WHERE id = $1
     RETURNING failed_login_attempts, is_locked, locked_until`,
    [userId]
  );
  return result.rows[0];
};

/**
 * Reset failed login attempts
 * @param {string} userId
 * @returns {Promise<void>}
 */
const resetFailedLoginAttempts = async (userId) => {
  await query(
    `UPDATE users 
     SET failed_login_attempts = 0, 
         is_locked = false, 
         locked_until = NULL 
     WHERE id = $1`,
    [userId]
  );
};

/**
 * Verify user (mark as verified)
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const verifyUser = async (userId) => {
  const result = await query(
    `UPDATE users 
     SET is_verified = true, updated_at = NOW() 
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, phone_number, email, is_verified`,
    [userId]
  );
  return result.rows[0];
};

/**
 * Update notification preferences
 * @param {string} userId
 * @param {Object} preferences
 * @returns {Promise<Object>}
 */
const updateNotificationPreferences = async (userId, preferences) => {
  const result = await query(
    `UPDATE users 
     SET notification_preferences = $1, updated_at = NOW() 
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id, notification_preferences`,
    [JSON.stringify(preferences), userId]
  );
  return result.rows[0];
};

/**
 * Soft delete user
 * @param {string} userId
 * @returns {Promise<void>}
 */
const softDelete = async (userId) => {
  await query(
    `UPDATE users 
     SET deleted_at = NOW(), is_active = false 
     WHERE id = $1`,
    [userId]
  );
};

/**
 * Check if phone number exists
 * @param {string} phoneNumber
 * @returns {Promise<boolean>}
 */
const phoneNumberExists = async (phoneNumber) => {
  const result = await query(
    "SELECT EXISTS(SELECT 1 FROM users WHERE phone_number = $1 AND deleted_at IS NULL) as exists",
    [phoneNumber]
  );
  return result.rows[0].exists;
};

/**
 * Check if email exists
 * @param {string} email
 * @returns {Promise<boolean>}
 */
const emailExists = async (email) => {
  const result = await query(
    "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND deleted_at IS NULL) as exists",
    [email]
  );
  return result.rows[0].exists;
};

/**
 * Get user statistics
 * @returns {Promise<Object>}
 */
const getStatistics = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_users,
      COUNT(*) FILTER (WHERE is_active = true AND deleted_at IS NULL) as active_users,
      COUNT(*) FILTER (WHERE is_verified = true AND deleted_at IS NULL) as verified_users,
      COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '24 hours') as active_last_24h,
      COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') as active_last_7d,
      COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days') as active_last_30d,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d
    FROM users
  `);
  return result.rows[0];
};

module.exports = {
  findByPhoneNumber,
  findByEmail,
  findById,
  findByUsername,
  create,
  updatePassword,
  updateProfile,
  updateLastLogin,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  verifyUser,
  updateNotificationPreferences,
  softDelete,
  phoneNumberExists,
  emailExists,
  getStatistics,
};
