const { query } = require("../config/database");

/**
 * Device Repository
 * Handles all database operations related to device tracking
 */

/**
 * Create or update device
 * @param {Object} deviceData
 * @returns {Promise<Object>}
 */
const upsert = async (deviceData) => {
  const {
    userId,
    deviceFingerprint,
    deviceName,
    deviceType,
    os,
    osVersion,
    browser,
    browserVersion,
    appVersion,
    ipAddress,
    pushToken,
    pushPlatform,
  } = deviceData;

  const result = await query(
    `INSERT INTO devices (
      user_id, device_fingerprint, device_name, device_type,
      os, os_version, browser, browser_version, app_version,
      last_ip_address, push_token, push_platform, last_seen_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (device_fingerprint) 
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      device_name = COALESCE(EXCLUDED.device_name, devices.device_name),
      device_type = COALESCE(EXCLUDED.device_type, devices.device_type),
      os = COALESCE(EXCLUDED.os, devices.os),
      os_version = COALESCE(EXCLUDED.os_version, devices.os_version),
      browser = COALESCE(EXCLUDED.browser, devices.browser),
      browser_version = COALESCE(EXCLUDED.browser_version, devices.browser_version),
      app_version = COALESCE(EXCLUDED.app_version, devices.app_version),
      last_ip_address = EXCLUDED.last_ip_address,
      push_token = COALESCE(EXCLUDED.push_token, devices.push_token),
      push_platform = COALESCE(EXCLUDED.push_platform, devices.push_platform),
      last_seen_at = NOW(),
      updated_at = NOW()
    RETURNING id, user_id, device_fingerprint, device_name, device_type, 
              is_trusted, is_blocked, last_seen_at`,
    [
      userId,
      deviceFingerprint,
      deviceName || null,
      deviceType || null,
      os || null,
      osVersion || null,
      browser || null,
      browserVersion || null,
      appVersion || null,
      ipAddress || null,
      pushToken || null,
      pushPlatform || null,
    ]
  );

  return result.rows[0];
};

/**
 * Find device by fingerprint
 * @param {string} deviceFingerprint
 * @returns {Promise<Object|null>}
 */
const findByFingerprint = async (deviceFingerprint) => {
  const result = await query(
    `SELECT id, user_id, device_fingerprint, device_name, device_type,
            os, os_version, browser, browser_version, app_version,
            is_trusted, trusted_at, is_blocked, blocked_at, block_reason,
            push_token, push_platform, last_ip_address, last_seen_at,
            created_at, updated_at
     FROM devices
     WHERE device_fingerprint = $1
     LIMIT 1`,
    [deviceFingerprint]
  );
  return result.rows[0] || null;
};

/**
 * Find device by ID
 * @param {string} deviceId
 * @returns {Promise<Object|null>}
 */
const findById = async (deviceId) => {
  const result = await query(
    `SELECT id, user_id, device_fingerprint, device_name, device_type,
            os, os_version, browser, browser_version, app_version,
            is_trusted, trusted_at, is_blocked, blocked_at, block_reason,
            push_token, push_platform, last_ip_address, last_seen_at,
            created_at, updated_at
     FROM devices
     WHERE id = $1
     LIMIT 1`,
    [deviceId]
  );
  return result.rows[0] || null;
};

/**
 * Find all devices for a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const findByUserId = async (userId) => {
  const result = await query(
    `SELECT id, device_fingerprint, device_name, device_type,
            os, os_version, browser, browser_version, app_version,
            is_trusted, is_blocked, last_ip_address, last_seen_at,
            created_at
     FROM devices
     WHERE user_id = $1 AND is_blocked = false
     ORDER BY last_seen_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Mark device as trusted
 * @param {string} deviceId
 * @returns {Promise<Object>}
 */
const markAsTrusted = async (deviceId) => {
  const result = await query(
    `UPDATE devices 
     SET is_trusted = true, trusted_at = NOW(), updated_at = NOW() 
     WHERE id = $1
     RETURNING id, device_fingerprint, is_trusted, trusted_at`,
    [deviceId]
  );
  return result.rows[0];
};

/**
 * Block device
 * @param {string} deviceId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
const blockDevice = async (deviceId, reason) => {
  const result = await query(
    `UPDATE devices 
     SET is_blocked = true, blocked_at = NOW(), 
         block_reason = $2, updated_at = NOW() 
     WHERE id = $1
     RETURNING id, device_fingerprint, is_blocked, blocked_at, block_reason`,
    [deviceId, reason]
  );
  return result.rows[0];
};

/**
 * Unblock device
 * @param {string} deviceId
 * @returns {Promise<Object>}
 */
const unblockDevice = async (deviceId) => {
  const result = await query(
    `UPDATE devices 
     SET is_blocked = false, blocked_at = NULL, 
         block_reason = NULL, updated_at = NOW() 
     WHERE id = $1
     RETURNING id, device_fingerprint, is_blocked`,
    [deviceId]
  );
  return result.rows[0];
};

/**
 * Update device push token
 * @param {string} deviceId
 * @param {string} pushToken
 * @param {string} pushPlatform
 * @returns {Promise<Object>}
 */
const updatePushToken = async (deviceId, pushToken, pushPlatform) => {
  const result = await query(
    `UPDATE devices 
     SET push_token = $2, push_platform = $3, updated_at = NOW() 
     WHERE id = $1
     RETURNING id, push_token, push_platform`,
    [deviceId, pushToken, pushPlatform]
  );
  return result.rows[0];
};

/**
 * Update last seen timestamp
 * @param {string} deviceId
 * @param {string} ipAddress
 * @returns {Promise<void>}
 */
const updateLastSeen = async (deviceId, ipAddress) => {
  await query(
    `UPDATE devices 
     SET last_seen_at = NOW(), 
         last_ip_address = $2,
         updated_at = NOW() 
     WHERE id = $1`,
    [deviceId, ipAddress]
  );
};

/**
 * Delete device
 * @param {string} deviceId
 * @returns {Promise<void>}
 */
const deleteDevice = async (deviceId) => {
  await query("DELETE FROM devices WHERE id = $1", [deviceId]);
};

/**
 * Get device statistics
 * @returns {Promise<Object>}
 */
const getStatistics = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) as total_devices,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(*) FILTER (WHERE is_trusted = true) as trusted_devices,
      COUNT(*) FILTER (WHERE is_blocked = true) as blocked_devices,
      COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '24 hours') as active_24h,
      COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '7 days') as active_7d,
      COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '30 days') as active_30d
    FROM devices
  `);
  return result.rows[0];
};

/**
 * Get device distribution by type
 * @returns {Promise<Array>}
 */
const getDeviceTypeDistribution = async () => {
  const result = await query(`
    SELECT 
      device_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM devices
    WHERE device_type IS NOT NULL AND is_blocked = false
    GROUP BY device_type
    ORDER BY count DESC
  `);
  return result.rows;
};

/**
 * Get OS distribution
 * @returns {Promise<Array>}
 */
const getOsDistribution = async () => {
  const result = await query(`
    SELECT 
      os,
      os_version,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM devices
    WHERE os IS NOT NULL AND is_blocked = false
    GROUP BY os, os_version
    ORDER BY count DESC
    LIMIT 20
  `);
  return result.rows;
};

/**
 * Find devices with suspicious activity
 * @param {number} maxDevicesPerUser
 * @returns {Promise<Array>}
 */
const findSuspiciousDevices = async (maxDevicesPerUser = 10) => {
  const result = await query(
    `SELECT user_id, COUNT(*) as device_count
     FROM devices
     WHERE is_blocked = false
       AND created_at > NOW() - INTERVAL '7 days'
     GROUP BY user_id
     HAVING COUNT(*) > $1
     ORDER BY device_count DESC`,
    [maxDevicesPerUser]
  );
  return result.rows;
};

module.exports = {
  upsert,
  findByFingerprint,
  findById,
  findByUserId,
  markAsTrusted,
  blockDevice,
  unblockDevice,
  updatePushToken,
  updateLastSeen,
  deleteDevice,
  getStatistics,
  getDeviceTypeDistribution,
  getOsDistribution,
  findSuspiciousDevices,
};
