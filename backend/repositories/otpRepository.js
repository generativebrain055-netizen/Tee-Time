const { query } = require("../config/database");

/**
 * OTP Repository
 * Handles all database operations related to OTP requests
 */

/**
 * Create a new OTP request
 * @param {Object} otpData
 * @returns {Promise<Object>}
 */
const create = async (otpData) => {
  const {
    phoneNumber,
    userId,
    otpCodeHash,
    purpose,
    expiresAt,
    ipAddress,
    deviceFingerprint,
    maxAttempts = 5,
  } = otpData;

  const result = await query(
    `INSERT INTO otp_requests (
      phone_number, user_id, otp_code_hash, purpose, 
      expires_at, ip_address, device_fingerprint, max_attempts
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, phone_number, purpose, attempts, max_attempts, created_at, expires_at`,
    [
      phoneNumber,
      userId || null,
      otpCodeHash,
      purpose,
      expiresAt,
      ipAddress || null,
      deviceFingerprint || null,
      maxAttempts,
    ]
  );

  return result.rows[0];
};

/**
 * Find the latest valid OTP request
 * @param {string} phoneNumber
 * @param {string} purpose
 * @returns {Promise<Object|null>}
 */
const findLatestValid = async (phoneNumber, purpose) => {
  const result = await query(
    `SELECT id, phone_number, user_id, otp_code_hash, purpose, 
            attempts, max_attempts, is_verified, expires_at, created_at
     FROM otp_requests
     WHERE phone_number = $1 
       AND purpose = $2
       AND is_verified = false
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phoneNumber, purpose]
  );
  return result.rows[0] || null;
};

/**
 * Increment OTP attempt counter
 * @param {string} otpId
 * @returns {Promise<Object>}
 */
const incrementAttempts = async (otpId) => {
  const result = await query(
    `UPDATE otp_requests 
     SET attempts = attempts + 1 
     WHERE id = $1
     RETURNING id, attempts, max_attempts`,
    [otpId]
  );
  return result.rows[0];
};

/**
 * Mark OTP as verified
 * @param {string} otpId
 * @returns {Promise<Object>}
 */
const markAsVerified = async (otpId) => {
  const result = await query(
    `UPDATE otp_requests 
     SET is_verified = true, verified_at = NOW() 
     WHERE id = $1
     RETURNING id, phone_number, user_id, purpose, verified_at`,
    [otpId]
  );
  return result.rows[0];
};

/**
 * Count OTP requests within time window
 * @param {string} phoneNumber
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
const countRecentRequests = async (phoneNumber, windowMinutes = 60) => {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM otp_requests
     WHERE phone_number = $1 
       AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
    [phoneNumber]
  );
  return parseInt(result.rows[0].count, 10);
};

/**
 * Count OTP requests by IP within time window
 * @param {string} ipAddress
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
const countRecentRequestsByIp = async (ipAddress, windowMinutes = 60) => {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM otp_requests
     WHERE ip_address = $1 
       AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
    [ipAddress]
  );
  return parseInt(result.rows[0].count, 10);
};

/**
 * Delete expired OTP requests
 * @returns {Promise<number>} Number of deleted records
 */
const deleteExpired = async () => {
  const result = await query(
    `DELETE FROM otp_requests 
     WHERE expires_at < NOW() AND is_verified = false
     RETURNING id`
  );
  return result.rowCount;
};

/**
 * Get OTP statistics
 * @returns {Promise<Object>}
 */
const getStatistics = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE is_verified = true) as verified_requests,
      COUNT(*) FILTER (WHERE is_verified = false AND expires_at < NOW()) as expired_requests,
      COUNT(*) FILTER (WHERE attempts >= max_attempts) as max_attempts_reached,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as requests_24h,
      COUNT(*) FILTER (WHERE is_verified = true AND created_at > NOW() - INTERVAL '24 hours') as verified_24h,
      ROUND(
        COUNT(*) FILTER (WHERE is_verified = true)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 
        2
      ) as verification_rate_percentage
    FROM otp_requests
    WHERE created_at > NOW() - INTERVAL '30 days'
  `);
  return result.rows[0];
};

/**
 * Get OTP statistics by purpose
 * @returns {Promise<Array>}
 */
const getStatisticsByPurpose = async () => {
  const result = await query(`
    SELECT 
      purpose,
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE is_verified = true) as verified_requests,
      ROUND(
        COUNT(*) FILTER (WHERE is_verified = true)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 
        2
      ) as verification_rate_percentage
    FROM otp_requests
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY purpose
    ORDER BY total_requests DESC
  `);
  return result.rows;
};

/**
 * Check if phone is being rate limited
 * @param {string} phoneNumber
 * @param {number} maxPerHour
 * @returns {Promise<boolean>}
 */
const isPhoneRateLimited = async (phoneNumber, maxPerHour = 5) => {
  const count = await countRecentRequests(phoneNumber, 60);
  return count >= maxPerHour;
};

/**
 * Check if IP is being rate limited
 * @param {string} ipAddress
 * @param {number} maxPerHour
 * @returns {Promise<boolean>}
 */
const isIpRateLimited = async (ipAddress, maxPerHour = 10) => {
  const count = await countRecentRequestsByIp(ipAddress, 60);
  return count >= maxPerHour;
};

module.exports = {
  create,
  findLatestValid,
  incrementAttempts,
  markAsVerified,
  countRecentRequests,
  countRecentRequestsByIp,
  deleteExpired,
  getStatistics,
  getStatisticsByPurpose,
  isPhoneRateLimited,
  isIpRateLimited,
};
