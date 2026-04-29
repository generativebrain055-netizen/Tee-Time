const cryptoUtils = require("../utils/crypto");
const sessionRepository = require("../repositories/sessionRepository");
const deviceFingerprint = require("../utils/deviceFingerprint");
const logger = require("../config/logger");

/**
 * Parse JWT-style expiry strings (same subset jsonwebtoken supports: 15m, 24h, 7d, 2w, 1y, etc.).
 * Used so DB `sessions.expires_at` stays aligned with refresh token lifetime.
 */
function jwtExpiryToMs(expiryStr) {
  const raw = String(expiryStr || "").trim();
  const m = raw.match(/^(\d+)([smhdwMy])$/i);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return 7 * 24 * 60 * 60 * 1000;
  const u = m[2].toLowerCase();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  switch (u) {
    case "s":
      return n * 1000;
    case "m":
      return n * minute;
    case "h":
      return n * hour;
    case "d":
      return n * day;
    case "w":
      return n * 7 * day;
    case "y":
      return n * 365 * day;
    default:
      return 7 * day;
  }
}

function accessExpiryEnv() {
  return process.env.JWT_ACCESS_EXPIRY || process.env.JWT_EXPIRES_IN || "7d";
}

function refreshExpiryEnv() {
  return process.env.JWT_REFRESH_EXPIRY || process.env.JWT_REFRESH_EXPIRES_IN || "7d";
}

function sessionExpiresAtFromRefreshEnv() {
  return new Date(Date.now() + jwtExpiryToMs(refreshExpiryEnv()));
}

/**
 * Session Service
 * Handles session creation, token generation, and device management
 */

/**
 * Create a new session for a user
 * @param {Object} params - Session parameters
 * @returns {Promise<Object>} Session tokens and info
 */
const createSession = async ({
  userId,
  req,
  rememberMe = false,
  deviceInfo = null,
}) => {
  // Extract and save device info
  const extractedDeviceInfo = deviceInfo || req.deviceInfo || deviceFingerprint.extractDeviceInfo(req);
  const device = await deviceFingerprint.saveDevice(userId, extractedDeviceInfo);

  // Generate JWT tokens
  const tokenFamilyId = cryptoUtils.generateSessionId();
  const accessToken = cryptoUtils.generateAccessToken(
    { userId },
    accessExpiryEnv()
  );
  const refreshToken = cryptoUtils.generateRefreshToken(
    { userId, tokenFamilyId },
    refreshExpiryEnv()
  );

  // Create session in database — must match refresh JWT lifetime so refresh isn't rejected early
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers["user-agent"];
  const expiresAt = sessionExpiresAtFromRefreshEnv();

  const session = await sessionRepository.create({
    userId,
    deviceId: device?.id || null,
    accessTokenHash: cryptoUtils.hashToken(accessToken),
    refreshTokenHash: cryptoUtils.hashToken(refreshToken),
    tokenFamilyId,
    ipAddress,
    userAgent,
    expiresAt,
    rememberMe,
  });

  return {
    accessToken,
    refreshToken,
    session,
    device,
  };
};

/**
 * Refresh session tokens
 * @param {string} oldRefreshToken - Current refresh token
 * @returns {Promise<Object>} New tokens
 */
const refreshSession = async (oldRefreshToken) => {
  // Verify refresh token
  let decoded;
  try {
    decoded = cryptoUtils.verifyRefreshToken(oldRefreshToken);
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }

  // Find session by refresh token hash
  const tokenHash = cryptoUtils.hashToken(oldRefreshToken);
  const session = await sessionRepository.findByRefreshToken(tokenHash);

  if (!session) {
    throw new Error("Session not found or expired");
  }

  // Generate new tokens
  const newAccessToken = cryptoUtils.generateAccessToken(
    { userId: session.user_id, sessionId: session.id },
    accessExpiryEnv()
  );

  const newRefreshToken = cryptoUtils.generateRefreshToken(
    {
      userId: session.user_id,
      sessionId: session.id,
      tokenFamilyId: session.token_family_id,
    },
    refreshExpiryEnv()
  );

  // Update session with new token hashes — roll forward full refresh window (stay signed in)
  const newAccessTokenHash = cryptoUtils.hashToken(newAccessToken);
  const newRefreshTokenHash = cryptoUtils.hashToken(newRefreshToken);
  const expiresAt = sessionExpiresAtFromRefreshEnv();

  await sessionRepository.updateTokens(
    session.id,
    newAccessTokenHash,
    newRefreshTokenHash,
    expiresAt
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    userId: session.user_id,
  };
};

/**
 * Revoke a session
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} reason - Revocation reason
 */
const revokeSession = async (sessionId, userId, reason = "user_logout") => {
  await sessionRepository.revoke(sessionId, userId, reason);
};

/**
 * Revoke all sessions for a user
 * @param {string} userId - User ID
 * @param {string} exceptSessionId - Session to keep active
 * @param {string} reason - Revocation reason
 * @returns {Promise<number>} Number of revoked sessions
 */
const revokeAllSessions = async (userId, exceptSessionId = null, reason = "user_logout_all") => {
  return sessionRepository.revokeAllForUser(userId, exceptSessionId, reason);
};

module.exports = {
  createSession,
  refreshSession,
  revokeSession,
  revokeAllSessions,
};
