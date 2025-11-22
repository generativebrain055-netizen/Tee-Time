const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * Hash Utilities
 * Provides secure hashing functions for passwords, tokens, and OTPs
 */

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @param {number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password, saltRounds = 12) => {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
const comparePassword = async (password, hash) => {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
};

/**
 * Hash a token using SHA-256
 * Used for storing access/refresh tokens securely
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Generate a secure random token
 * @param {number} bytes - Number of random bytes (default: 32)
 * @returns {string} Random token in hex format
 */
const generateToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

/**
 * Generate a random numeric OTP code
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} Numeric OTP code
 */
const generateOTP = (length = 6) => {
  const digits = "0123456789";
  let otp = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }

  return otp;
};

/**
 * Hash OTP for secure storage
 * @param {string} otp - Plain OTP code
 * @returns {string} Hashed OTP
 */
const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp.toString()).digest("hex");
};

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (e.g., '15m', '1h')
 * @returns {string} JWT token
 */
const generateAccessToken = (payload, expiresIn = "15m") => {
  const secret = process.env.JWT_SECRET || "default-secret-change-this";

  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: "tts-golf-app",
    audience: "tts-golf-users",
  });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (e.g., '7d', '30d')
 * @returns {string} JWT token
 */
const generateRefreshToken = (payload, expiresIn = "7d") => {
  const secret =
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_SECRET ||
    "default-secret-change-this";

  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: "tts-golf-app",
    audience: "tts-golf-users",
  });
};

/**
 * Verify JWT access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  const secret = process.env.JWT_SECRET || "default-secret-change-this";

  return jwt.verify(token, secret, {
    issuer: "tts-golf-app",
    audience: "tts-golf-users",
  });
};

/**
 * Verify JWT refresh token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  const secret =
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_SECRET ||
    "default-secret-change-this";

  return jwt.verify(token, secret, {
    issuer: "tts-golf-app",
    audience: "tts-golf-users",
  });
};

/**
 * Generate a unique session ID
 * @returns {string} UUID v4
 */
const generateSessionId = () => {
  return crypto.randomUUID();
};

/**
 * Generate device fingerprint hash
 * @param {Object} deviceInfo - Device information
 * @returns {string} Device fingerprint hash
 */
const generateDeviceFingerprint = (deviceInfo) => {
  const {
    userAgent,
    platform,
    language,
    timezone,
    screenResolution,
    colorDepth,
  } = deviceInfo;

  const fingerprintData = [
    userAgent || "",
    platform || "",
    language || "",
    timezone || "",
    screenResolution || "",
    colorDepth || "",
  ].join("|");

  return crypto.createHash("sha256").update(fingerprintData).digest("hex");
};

/**
 * Create HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} HMAC signature
 */
const createHMAC = (data, secret) => {
  return crypto
    .createHmac("sha256", secret || process.env.JWT_SECRET || "default-secret")
    .update(data)
    .digest("hex");
};

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - HMAC signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} True if signature is valid
 */
const verifyHMAC = (data, signature, secret) => {
  const expectedSignature = createHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

module.exports = {
  hashPassword,
  comparePassword,
  hashToken,
  generateToken,
  generateOTP,
  hashOTP,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSessionId,
  generateDeviceFingerprint,
  createHMAC,
  verifyHMAC,
};
