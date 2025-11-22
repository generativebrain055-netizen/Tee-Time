/**
 * Validation Utilities
 * Provides validation functions for user inputs
 */

/**
 * Validate phone number format
 * Accepts E.164 format: +[country code][number]
 * @param {string} phoneNumber
 * @returns {boolean}
 */
const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return false;
  }

  // E.164 format: +[1-3 digit country code][up to 14 digits]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
};

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * @param {string} password
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password || typeof password !== "string") {
    return { isValid: false, errors: ["Password is required"] };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password",
    "password123",
    "12345678",
    "qwerty",
    "abc123",
    "password1",
    "admin123",
    "letmein",
    "welcome",
    "monkey",
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common. Please choose a stronger password");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate OTP code
 * @param {string} otp
 * @param {number} expectedLength
 * @returns {boolean}
 */
const isValidOTP = (otp, expectedLength = 6) => {
  if (!otp || typeof otp !== "string") {
    return false;
  }

  const otpRegex = new RegExp(`^\\d{${expectedLength}}$`);
  return otpRegex.test(otp);
};

/**
 * Validate UUID format
 * @param {string} uuid
 * @returns {boolean}
 */
const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== "string") {
    return false;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Sanitize string input
 * Removes potentially dangerous characters
 * @param {string} input
 * @returns {string}
 */
const sanitizeString = (input) => {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters
};

/**
 * Validate and sanitize name
 * @param {string} name
 * @returns {Object} { isValid: boolean, sanitized: string, error: string }
 */
const validateName = (name) => {
  if (!name || typeof name !== "string") {
    return { isValid: false, sanitized: "", error: "Name is required" };
  }

  const sanitized = sanitizeString(name);

  if (sanitized.length === 0) {
    return { isValid: false, sanitized: "", error: "Name cannot be empty" };
  }

  if (sanitized.length > 100) {
    return {
      isValid: false,
      sanitized: "",
      error: "Name is too long (max 100 characters)",
    };
  }

  // Only allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(sanitized)) {
    return {
      isValid: false,
      sanitized: "",
      error: "Name can only contain letters, spaces, hyphens, and apostrophes",
    };
  }

  return { isValid: true, sanitized, error: null };
};

/**
 * Validate timezone string
 * @param {string} timezone
 * @returns {boolean}
 */
const isValidTimezone = (timezone) => {
  if (!timezone || typeof timezone !== "string") {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate language code (ISO 639-1)
 * @param {string} language
 * @returns {boolean}
 */
const isValidLanguageCode = (language) => {
  if (!language || typeof language !== "string") {
    return false;
  }

  const languageRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
  return languageRegex.test(language);
};

/**
 * Validate URL
 * @param {string} url
 * @returns {boolean}
 */
const isValidURL = (url) => {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return ["http:", "https:"].includes(urlObj.protocol);
  } catch (error) {
    return false;
  }
};

/**
 * Validate IP address (IPv4 or IPv6)
 * @param {string} ip
 * @returns {boolean}
 */
const isValidIP = (ip) => {
  if (!ip || typeof ip !== "string") {
    return false;
  }

  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".");
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6 (simplified check)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
};

/**
 * Validate pagination parameters
 * @param {number} page
 * @param {number} limit
 * @returns {Object} { page: number, limit: number, offset: number }
 */
const validatePagination = (page, limit) => {
  const validatedPage = Math.max(1, parseInt(page, 10) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (validatedPage - 1) * validatedLimit;

  return {
    page: validatedPage,
    limit: validatedLimit,
    offset,
  };
};

/**
 * Validate request body against schema
 * @param {Object} body - Request body
 * @param {Object} schema - Validation schema
 * @returns {Object} { isValid: boolean, errors: Object }
 */
const validateRequestBody = (body, schema) => {
  const errors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];

    // Check required
    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors[field] = `${field} is required`;
      continue;
    }

    // Skip further validation if not required and not provided
    if (
      !rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      continue;
    }

    // Check type
    if (rules.type && typeof value !== rules.type) {
      errors[field] = `${field} must be of type ${rules.type}`;
      continue;
    }

    // Check custom validator
    if (rules.validator && !rules.validator(value)) {
      errors[field] = rules.message || `${field} is invalid`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = {
  isValidPhoneNumber,
  isValidEmail,
  validatePassword,
  isValidOTP,
  isValidUUID,
  sanitizeString,
  validateName,
  isValidTimezone,
  isValidLanguageCode,
  isValidURL,
  isValidIP,
  validatePagination,
  validateRequestBody,
};
