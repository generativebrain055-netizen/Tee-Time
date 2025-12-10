const { query } = require("../config/database");

/**
 * Magic Link Repository
 * Handles all database operations related to magic link authentication
 */

/**
 * Create a new magic link
 * @param {Object} linkData
 * @returns {Promise<Object>}
 */
const create = async (linkData) => {
  const {
    userId,
    email,
    phoneNumber,
    tokenHash,
    purpose,
    expiresAt,
    ipAddress,
    userAgent,
    deviceFingerprint,
    maxAttempts = 3,
    metadata = null,
  } = linkData;

  const result = await query(
    `INSERT INTO magic_links (
      user_id, email, phone_number, token_hash, purpose, 
      expires_at, ip_address, user_agent, device_fingerprint, max_attempts, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, email, phone_number, purpose, created_at, expires_at, metadata`,
    [
      userId || null,
      email || null,
      phoneNumber || null,
      tokenHash,
      purpose,
      expiresAt,
      ipAddress || null,
      userAgent || null,
      deviceFingerprint || null,
      maxAttempts,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  return result.rows[0];
};

/**
 * Find magic link by token hash
 * @param {string} tokenHash
 * @returns {Promise<Object|null>}
 */
const findByTokenHash = async (tokenHash) => {
  const result = await query(
    `SELECT id, user_id, email, phone_number, purpose, 
            attempts, max_attempts, is_used, used_at, 
            created_at, expires_at, metadata
     FROM magic_links
     WHERE token_hash = $1 
       AND is_used = false
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
};

/**
 * Increment magic link attempt counter
 * @param {string} linkId
 * @returns {Promise<Object>}
 */
const incrementAttempts = async (linkId) => {
  const result = await query(
    `UPDATE magic_links 
     SET attempts = attempts + 1 
     WHERE id = $1
     RETURNING id, attempts, max_attempts`,
    [linkId]
  );
  return result.rows[0];
};

/**
 * Mark magic link as used
 * @param {string} linkId
 * @returns {Promise<Object>}
 */
const markAsUsed = async (linkId) => {
  const result = await query(
    `UPDATE magic_links 
     SET is_used = true, used_at = NOW() 
     WHERE id = $1
     RETURNING id, email, user_id, purpose, used_at`,
    [linkId]
  );
  return result.rows[0];
};

/**
 * Count recent magic link requests for email
 * @param {string} email
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
const countRecentRequests = async (email, windowMinutes = 60) => {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM magic_links
     WHERE email = $1 
       AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
    [email]
  );
  return parseInt(result.rows[0].count, 10);
};

/**
 * Count recent magic link requests by IP
 * @param {string} ipAddress
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
const countRecentRequestsByIp = async (ipAddress, windowMinutes = 60) => {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM magic_links
     WHERE ip_address = $1 
       AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
    [ipAddress]
  );
  return parseInt(result.rows[0].count, 10);
};

/**
 * Delete expired magic links
 * @returns {Promise<number>} Number of deleted records
 */
const deleteExpired = async () => {
  const result = await query(
    `DELETE FROM magic_links 
     WHERE expires_at < NOW() AND is_used = false
     RETURNING id`
  );
  return result.rowCount;
};

/**
 * Invalidate all unused magic links for user
 * @param {string} userId
 * @returns {Promise<number>}
 */
const invalidateAllForUser = async (userId) => {
  const result = await query(
    `UPDATE magic_links 
     SET is_used = true, used_at = NOW() 
     WHERE user_id = $1 AND is_used = false
     RETURNING id`,
    [userId]
  );
  return result.rowCount;
};

/**
 * Get magic link statistics
 * @returns {Promise<Object>}
 */
const getStatistics = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) as total_links,
      COUNT(*) FILTER (WHERE is_used = true) as used_links,
      COUNT(*) FILTER (WHERE is_used = false AND expires_at < NOW()) as expired_links,
      COUNT(*) FILTER (WHERE attempts >= max_attempts) as max_attempts_reached,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as links_24h,
      COUNT(*) FILTER (WHERE is_used = true AND created_at > NOW() - INTERVAL '24 hours') as used_24h,
      ROUND(
        COUNT(*) FILTER (WHERE is_used = true)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 
        2
      ) as usage_rate_percentage
    FROM magic_links
    WHERE created_at > NOW() - INTERVAL '30 days'
  `);
  return result.rows[0];
};

/**
 * Get magic link statistics by purpose
 * @returns {Promise<Array>}
 */
const getStatisticsByPurpose = async () => {
  const result = await query(`
    SELECT 
      purpose,
      COUNT(*) as total_links,
      COUNT(*) FILTER (WHERE is_used = true) as used_links,
      ROUND(
        COUNT(*) FILTER (WHERE is_used = true)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 
        2
      ) as usage_rate_percentage
    FROM magic_links
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY purpose
    ORDER BY total_links DESC
  `);
  return result.rows;
};

/**
 * Check if email is being rate limited
 * @param {string} email
 * @param {number} maxPerHour
 * @returns {Promise<boolean>}
 */
const isEmailRateLimited = async (email, maxPerHour = 3) => {
  const count = await countRecentRequests(email, 60);
  return count >= maxPerHour;
};

/**
 * Count recent magic link requests for phone number
 * @param {string} phoneNumber
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
const countRecentRequestsByPhone = async (phoneNumber, windowMinutes = 60) => {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM magic_links
     WHERE phone_number = $1 
       AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
    [phoneNumber]
  );
  return parseInt(result.rows[0].count, 10);
};

/**
 * Check if phone is being rate limited
 * @param {string} phoneNumber
 * @param {number} maxPerHour
 * @returns {Promise<boolean>}
 */
const isPhoneRateLimited = async (phoneNumber, maxPerHour = 3) => {
  const count = await countRecentRequestsByPhone(phoneNumber, 60);
  return count >= maxPerHour;
};

module.exports = {
  create,
  findByTokenHash,
  incrementAttempts,
  markAsUsed,
  countRecentRequests,
  countRecentRequestsByIp,
  countRecentRequestsByPhone,
  deleteExpired,
  invalidateAllForUser,
  getStatistics,
  getStatisticsByPurpose,
  isEmailRateLimited,
  isPhoneRateLimited,
};
