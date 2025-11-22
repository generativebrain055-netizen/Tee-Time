const { query, getClient } = require("../config/database");

/**
 * Session Repository
 * Handles all database operations related to user sessions
 */

/**
 * Create a new session
 * @param {Object} sessionData
 * @returns {Promise<Object>}
 */
const create = async (sessionData) => {
  const {
    userId,
    deviceId,
    accessTokenHash,
    refreshTokenHash,
    tokenFamilyId,
    ipAddress,
    userAgent,
    expiresAt,
    rememberMe,
  } = sessionData;

  const result = await query(
    `INSERT INTO sessions (
      user_id, device_id, access_token_hash, refresh_token_hash,
      token_family_id, ip_address, user_agent, expires_at, remember_me
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, user_id, device_id, token_family_id, created_at, expires_at, is_active`,
    [
      userId,
      deviceId || null,
      accessTokenHash,
      refreshTokenHash,
      tokenFamilyId,
      ipAddress,
      userAgent,
      expiresAt,
      rememberMe || false,
    ]
  );

  return result.rows[0];
};

/**
 * Find session by access token hash
 * @param {string} tokenHash
 * @returns {Promise<Object|null>}
 */
const findByAccessToken = async (tokenHash) => {
  const result = await query(
    `SELECT s.*, u.phone_number, u.email, u.is_active as user_is_active
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.access_token_hash = $1 
       AND s.is_active = true 
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL
     LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
};

/**
 * Find session by refresh token hash
 * @param {string} tokenHash
 * @returns {Promise<Object|null>}
 */
const findByRefreshToken = async (tokenHash) => {
  const result = await query(
    `SELECT s.*, u.phone_number, u.email, u.is_active as user_is_active
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.refresh_token_hash = $1 
       AND s.is_active = true 
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL
     LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
};

/**
 * Find all active sessions for a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const findByUserId = async (userId) => {
  const result = await query(
    `SELECT s.id, s.device_id, s.ip_address, s.user_agent, 
            s.created_at, s.last_activity_at, s.expires_at,
            s.remember_me, d.device_name, d.device_type, d.os
     FROM sessions s
     LEFT JOIN devices d ON s.device_id = d.id
     WHERE s.user_id = $1 
       AND s.is_active = true 
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL
     ORDER BY s.last_activity_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Update session tokens (for token rotation)
 * @param {string} sessionId
 * @param {string} newAccessTokenHash
 * @param {string} newRefreshTokenHash
 * @param {Date} newExpiresAt
 * @returns {Promise<Object>}
 */
const updateTokens = async (
  sessionId,
  newAccessTokenHash,
  newRefreshTokenHash,
  newExpiresAt
) => {
  const result = await query(
    `UPDATE sessions 
     SET access_token_hash = $1,
         refresh_token_hash = $2,
         expires_at = $3,
         last_activity_at = NOW()
     WHERE id = $4 AND is_active = true AND revoked_at IS NULL
     RETURNING id, user_id, device_id, token_family_id, expires_at`,
    [newAccessTokenHash, newRefreshTokenHash, newExpiresAt, sessionId]
  );
  return result.rows[0];
};

/**
 * Update last activity timestamp
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
const updateLastActivity = async (sessionId) => {
  await query("UPDATE sessions SET last_activity_at = NOW() WHERE id = $1", [
    sessionId,
  ]);
};

/**
 * Revoke a specific session
 * @param {string} sessionId
 * @param {string} revokedBy - Optional user ID who revoked it
 * @param {string} reason
 * @returns {Promise<void>}
 */
const revoke = async (sessionId, revokedBy = null, reason = null) => {
  await query(
    `UPDATE sessions 
     SET is_active = false, 
         revoked_at = NOW(),
         revoked_by = $2,
         revoke_reason = $3
     WHERE id = $1`,
    [sessionId, revokedBy, reason]
  );
};

/**
 * Revoke all sessions for a user
 * @param {string} userId
 * @param {string} exceptSessionId - Optional session ID to keep active
 * @param {string} reason
 * @returns {Promise<number>} Number of revoked sessions
 */
const revokeAllForUser = async (
  userId,
  exceptSessionId = null,
  reason = "logout_all"
) => {
  let queryText = `
    UPDATE sessions 
    SET is_active = false, 
        revoked_at = NOW(),
        revoke_reason = $2
    WHERE user_id = $1 
      AND is_active = true
  `;

  const params = [userId, reason];

  if (exceptSessionId) {
    queryText += " AND id != $3";
    params.push(exceptSessionId);
  }

  queryText += " RETURNING id";

  const result = await query(queryText, params);
  return result.rowCount;
};

/**
 * Revoke sessions by token family (for detecting token theft)
 * @param {string} tokenFamilyId
 * @returns {Promise<number>} Number of revoked sessions
 */
const revokeByTokenFamily = async (tokenFamilyId) => {
  const result = await query(
    `UPDATE sessions 
     SET is_active = false, 
         revoked_at = NOW(),
         revoke_reason = 'token_theft_detected'
     WHERE token_family_id = $1 AND is_active = true
     RETURNING id`,
    [tokenFamilyId]
  );
  return result.rowCount;
};

/**
 * Delete expired sessions
 * @returns {Promise<number>} Number of deleted sessions
 */
const deleteExpired = async () => {
  const result = await query(
    `DELETE FROM sessions 
     WHERE expires_at < NOW() 
        OR (is_active = false AND revoked_at < NOW() - INTERVAL '30 days')
     RETURNING id`
  );
  return result.rowCount;
};

/**
 * Get session statistics for a user
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getUserSessionStats = async (userId) => {
  const result = await query(
    `SELECT 
      COUNT(*) FILTER (WHERE is_active = true AND expires_at > NOW()) as active_sessions,
      COUNT(*) FILTER (WHERE is_active = false AND revoked_at IS NOT NULL) as revoked_sessions,
      COUNT(DISTINCT device_id) as unique_devices,
      MAX(last_activity_at) as last_activity,
      MIN(created_at) FILTER (WHERE is_active = true) as oldest_active_session
     FROM sessions
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
};

/**
 * Get global session statistics
 * @returns {Promise<Object>}
 */
const getGlobalStats = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE is_active = true AND expires_at > NOW()) as active_sessions,
      COUNT(*) FILTER (WHERE last_activity_at > NOW() - INTERVAL '24 hours') as active_24h,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_sessions_24h,
      COUNT(DISTINCT user_id) FILTER (WHERE is_active = true) as unique_active_users,
      COUNT(DISTINCT device_id) FILTER (WHERE is_active = true) as unique_active_devices,
      AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_session_duration_seconds
    FROM sessions
  `);
  return result.rows[0];
};

/**
 * Check if session exists and is valid
 * @param {string} sessionId
 * @returns {Promise<boolean>}
 */
const isValid = async (sessionId) => {
  const result = await query(
    `SELECT EXISTS(
      SELECT 1 FROM sessions 
      WHERE id = $1 
        AND is_active = true 
        AND expires_at > NOW()
        AND revoked_at IS NULL
    ) as is_valid`,
    [sessionId]
  );
  return result.rows[0].is_valid;
};

module.exports = {
  create,
  findByAccessToken,
  findByRefreshToken,
  findByUserId,
  updateTokens,
  updateLastActivity,
  revoke,
  revokeAllForUser,
  revokeByTokenFamily,
  deleteExpired,
  getUserSessionStats,
  getGlobalStats,
  isValid,
};
