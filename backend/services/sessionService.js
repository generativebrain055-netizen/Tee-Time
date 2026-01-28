const cryptoUtils = require("../utils/crypto");
const sessionRepository = require("../repositories/sessionRepository");
const deviceFingerprint = require("../utils/deviceFingerprint");
const logger = require("../config/logger");

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
    process.env.JWT_ACCESS_EXPIRY || "15m"
  );
  const refreshToken = cryptoUtils.generateRefreshToken(
    { userId, tokenFamilyId },
    process.env.JWT_REFRESH_EXPIRY || "7d"
  );

  // Create session in database
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers["user-agent"];
  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);

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
    process.env.JWT_ACCESS_EXPIRY || "15m"
  );

  const newRefreshToken = cryptoUtils.generateRefreshToken(
    {
      userId: session.user_id,
      sessionId: session.id,
      tokenFamilyId: session.token_family_id,
    },
    process.env.JWT_REFRESH_EXPIRY || "7d"
  );

  // Update session with new token hashes
  const newAccessTokenHash = cryptoUtils.hashToken(newAccessToken);
  const newRefreshTokenHash = cryptoUtils.hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
