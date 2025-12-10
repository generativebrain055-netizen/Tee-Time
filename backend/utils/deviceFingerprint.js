const crypto = require("crypto");
const { query } = require("../config/database");
const logger = require("../config/logger");

/**
 * Device Fingerprinting Utilities
 * Captures and tracks device information for security and analytics
 */

/**
 * Extract device information from request
 * Prioritizes explicit headers from mobile app over user-agent parsing
 * @param {Object} req - Express request object
 * @returns {Object} Device information
 */
const extractDeviceInfo = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  const acceptLanguage = req.headers["accept-language"] || "";
  const ipAddress = req.ip || req.connection.remoteAddress || "";

  // Check for explicit device info headers from mobile app
  const explicitDeviceId = req.headers["x-device-id"];
  const explicitDeviceName = req.headers["x-device-name"];
  const explicitDeviceType = req.headers["x-device-type"];
  const explicitDeviceOS = req.headers["x-device-os"];
  const explicitAppVersion = req.headers["x-app-version"];

  // Also check for device info in request body (alternative method)
  const bodyDeviceInfo = req.body?.deviceInfo;

  // Parse user agent as fallback
  const parsedInfo = parseUserAgent(userAgent);

  // If we have explicit device info from mobile app, use that
  if (explicitDeviceName || bodyDeviceInfo) {
    const mobileInfo = bodyDeviceInfo || {};
    const deviceName = explicitDeviceName || mobileInfo.deviceName;
    const deviceType = explicitDeviceType || mobileInfo.deviceType || "Mobile";
    const deviceOS =
      explicitDeviceOS ||
      `${mobileInfo.os || ""} ${mobileInfo.osVersion || ""}`.trim();

    // Parse OS info
    let os = parsedInfo.os;
    let osVersion = parsedInfo.osVersion;
    if (deviceOS) {
      const osParts = deviceOS.split(" ");
      os = osParts[0] || parsedInfo.os;
      osVersion = osParts.slice(1).join(" ") || parsedInfo.osVersion;
    }
    if (mobileInfo.os) {
      os = mobileInfo.os;
      osVersion = mobileInfo.osVersion || "";
    }

    logger.info("📱 Mobile device info captured:", {
      deviceName,
      deviceType,
      os,
      osVersion,
      appVersion: explicitAppVersion || mobileInfo.appVersion,
      deviceId: explicitDeviceId || mobileInfo.deviceId,
    });

    return {
      userAgent,
      ipAddress,
      acceptLanguage,
      browser: "TeeTime App",
      browserVersion: explicitAppVersion || mobileInfo.appVersion || "1.0.0",
      os,
      osVersion,
      deviceType,
      deviceName: deviceName || `${os} ${deviceType}`,
      deviceId: explicitDeviceId || mobileInfo.deviceId,
      appVersion: explicitAppVersion || mobileInfo.appVersion,
      isNativeApp: true,
    };
  }

  // Fallback to user-agent parsing for web requests
  return {
    userAgent,
    ipAddress,
    acceptLanguage,
    ...parsedInfo,
    isNativeApp: false,
  };
};

/**
 * Parse user agent string
 * @param {string} userAgent
 * @returns {Object} Parsed device information
 */
const parseUserAgent = (userAgent) => {
  const info = {
    browser: "Unknown",
    browserVersion: "",
    os: "Unknown",
    osVersion: "",
    deviceType: "Unknown",
    deviceName: null,
  };

  if (!userAgent) return info;

  // Detect OS
  if (/Windows NT 10/i.test(userAgent)) {
    info.os = "Windows";
    info.osVersion = "10";
  } else if (/Windows NT 6.3/i.test(userAgent)) {
    info.os = "Windows";
    info.osVersion = "8.1";
  } else if (/Windows NT 6.2/i.test(userAgent)) {
    info.os = "Windows";
    info.osVersion = "8";
  } else if (/Windows NT 6.1/i.test(userAgent)) {
    info.os = "Windows";
    info.osVersion = "7";
  } else if (/Mac OS X ([\d._]+)/i.test(userAgent)) {
    info.os = "macOS";
    const match = userAgent.match(/Mac OS X ([\d._]+)/i);
    info.osVersion = match ? match[1].replace(/_/g, ".") : "";
  } else if (/Android ([\d.]+)/i.test(userAgent)) {
    info.os = "Android";
    const match = userAgent.match(/Android ([\d.]+)/i);
    info.osVersion = match ? match[1] : "";
  } else if (/iPhone OS ([\d_]+)/i.test(userAgent)) {
    info.os = "iOS";
    const match = userAgent.match(/iPhone OS ([\d_]+)/i);
    info.osVersion = match ? match[1].replace(/_/g, ".") : "";
  } else if (/iPad.*OS ([\d_]+)/i.test(userAgent)) {
    info.os = "iPadOS";
    const match = userAgent.match(/OS ([\d_]+)/i);
    info.osVersion = match ? match[1].replace(/_/g, ".") : "";
  } else if (/Linux/i.test(userAgent)) {
    info.os = "Linux";
  }

  // Detect Browser
  if (/Edg\/([\d.]+)/i.test(userAgent)) {
    info.browser = "Edge";
    const match = userAgent.match(/Edg\/([\d.]+)/i);
    info.browserVersion = match ? match[1] : "";
  } else if (/Chrome\/([\d.]+)/i.test(userAgent) && !/Edg/i.test(userAgent)) {
    info.browser = "Chrome";
    const match = userAgent.match(/Chrome\/([\d.]+)/i);
    info.browserVersion = match ? match[1] : "";
  } else if (
    /Safari\/([\d.]+)/i.test(userAgent) &&
    !/Chrome/i.test(userAgent)
  ) {
    info.browser = "Safari";
    const match = userAgent.match(/Version\/([\d.]+)/i);
    info.browserVersion = match ? match[1] : "";
  } else if (/Firefox\/([\d.]+)/i.test(userAgent)) {
    info.browser = "Firefox";
    const match = userAgent.match(/Firefox\/([\d.]+)/i);
    info.browserVersion = match ? match[1] : "";
  }

  // Detect Device Type
  if (/Mobile|Android|iPhone/i.test(userAgent)) {
    info.deviceType = "Mobile";
  } else if (/iPad|Tablet/i.test(userAgent)) {
    info.deviceType = "Tablet";
  } else {
    info.deviceType = "Desktop";
  }

  // Extract device name for mobile
  if (/iPhone/i.test(userAgent)) {
    info.deviceName = "iPhone";
  } else if (/iPad/i.test(userAgent)) {
    info.deviceName = "iPad";
  } else if (/Android/i.test(userAgent)) {
    const match = userAgent.match(/Android.*;\s*([^)]+)\s*Build/i);
    info.deviceName = match ? match[1].trim() : "Android Device";
  }

  return info;
};

/**
 * Generate device fingerprint hash
 * For native apps, uses deviceId if available (more stable)
 * For web, uses combination of user agent and other factors
 * @param {Object} deviceInfo
 * @returns {string} Fingerprint hash
 */
const generateFingerprint = (deviceInfo) => {
  // If we have a stable deviceId from native app, use it as primary identifier
  if (deviceInfo.deviceId && deviceInfo.isNativeApp) {
    return crypto
      .createHash("sha256")
      .update(`native_${deviceInfo.deviceId}`)
      .digest("hex");
  }

  // For web or fallback, use combination of factors
  const { userAgent, ipAddress, acceptLanguage, browser, os, deviceType } =
    deviceInfo;

  const fingerprintData = [
    userAgent || "",
    ipAddress || "",
    acceptLanguage || "",
    browser || "",
    os || "",
    deviceType || "",
  ].join("|");

  return crypto.createHash("sha256").update(fingerprintData).digest("hex");
};

/**
 * Save or update device in database
 * @param {string} userId
 * @param {Object} deviceInfo
 * @returns {Promise<Object>} Device record
 */
const saveDevice = async (userId, deviceInfo) => {
  try {
    const fingerprint = generateFingerprint(deviceInfo);

    logger.info("💾 Saving device:", {
      userId,
      deviceName: deviceInfo.deviceName,
      isNativeApp: deviceInfo.isNativeApp,
      fingerprint: fingerprint.substring(0, 16) + "...",
    });

    // Check if device already exists for this user
    const existing = await query(
      `SELECT id FROM devices 
       WHERE user_id = $1 AND device_fingerprint = $2
       LIMIT 1`,
      [userId, fingerprint]
    );

    if (existing.rows.length > 0) {
      // Update existing device
      const result = await query(
        `UPDATE devices 
         SET last_seen_at = NOW(),
             last_ip_address = $1,
             user_agent = $2,
             device_name = COALESCE($3, device_name),
             app_version = COALESCE($4, app_version),
             is_native_app = $5
         WHERE id = $6
         RETURNING id, device_name, device_type, os, browser, is_native_app`,
        [
          deviceInfo.ipAddress,
          deviceInfo.userAgent,
          deviceInfo.deviceName,
          deviceInfo.appVersion,
          deviceInfo.isNativeApp || false,
          existing.rows[0].id,
        ]
      );
      logger.info("📱 Device updated:", result.rows[0]?.device_name);
      return result.rows[0];
    }

    // Create new device
    const result = await query(
      `INSERT INTO devices (
        user_id, device_fingerprint, device_name, device_type,
        os, os_version, browser, browser_version,
        app_version, user_agent, last_ip_address, is_native_app
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, device_name, device_type, os, browser, is_native_app`,
      [
        userId,
        fingerprint,
        deviceInfo.deviceName || `${deviceInfo.os} ${deviceInfo.deviceType}`,
        deviceInfo.deviceType,
        deviceInfo.os,
        deviceInfo.osVersion,
        deviceInfo.browser,
        deviceInfo.browserVersion,
        deviceInfo.appVersion,
        deviceInfo.userAgent,
        deviceInfo.ipAddress,
        deviceInfo.isNativeApp || false,
      ]
    );

    logger.info("📱 New device created:", result.rows[0]?.device_name);
    return result.rows[0];
  } catch (error) {
    logger.error("Error saving device:", error);
    return null;
  }
};

/**
 * Get all devices for a user
 * @param {string} userId
 * @returns {Promise<Array>} List of devices
 */
const getUserDevices = async (userId) => {
  const result = await query(
    `SELECT 
      id, device_name, device_type, os, os_version,
      browser, browser_version, last_seen_at, last_ip_address,
      is_trusted, created_at
    FROM devices
    WHERE user_id = $1
    ORDER BY last_seen_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Trust a device
 * @param {string} deviceId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
const trustDevice = async (deviceId, userId) => {
  const result = await query(
    `UPDATE devices 
     SET is_trusted = true 
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [deviceId, userId]
  );
  return result.rowCount > 0;
};

/**
 * Remove device
 * @param {string} deviceId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
const removeDevice = async (deviceId, userId) => {
  const result = await query(
    `DELETE FROM devices 
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [deviceId, userId]
  );
  return result.rowCount > 0;
};

/**
 * Middleware to capture device information
 */
const captureDeviceInfo = async (req, res, next) => {
  try {
    const deviceInfo = extractDeviceInfo(req);
    req.deviceInfo = deviceInfo;

    // If user is authenticated, save device
    if (req.user?.id) {
      const device = await saveDevice(req.user.id, deviceInfo);
      req.device = device;
    }

    next();
  } catch (error) {
    logger.error("Error capturing device info:", error);
    // Don't block request on device capture failure
    next();
  }
};

module.exports = {
  extractDeviceInfo,
  parseUserAgent,
  generateFingerprint,
  saveDevice,
  getUserDevices,
  trustDevice,
  removeDevice,
  captureDeviceInfo,
};
