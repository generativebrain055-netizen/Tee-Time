const twilio = require("twilio");
const crypto = require("crypto");
const logger = require("../config/logger");

/**
 * Twilio Service
 * Handles all Twilio-related operations: OTP sending/verification, SMS
 */

let twilioClient = null;
let verifyService = null;

/**
 * Initialize Twilio client
 */
const initializeTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken) {
    logger.warn("Twilio credentials not configured. OTP will be logged to console.");
    return { client: null, verify: null };
  }

  if (!accountSid.startsWith("AC")) {
    logger.error("Invalid TWILIO_ACCOUNT_SID. Must start with AC");
    return { client: null, verify: null };
  }

  try {
    const client = twilio(accountSid, authToken);
    const verify = verifyServiceSid ? client.verify.v2.services(verifyServiceSid) : null;

    if (!verify) {
      logger.warn("TWILIO_VERIFY_SERVICE_SID not configured. Using fallback OTP method.");
    }

    return { client, verify };
  } catch (error) {
    logger.error("Failed to initialize Twilio client:", error);
    return { client: null, verify: null };
  }
};

// Initialize on module load
const twilioInit = initializeTwilioClient();
twilioClient = twilioInit.client;
verifyService = twilioInit.verify;

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via Twilio Verify API or fallback to SMS
 */
const sendOTP = async (phoneNumber) => {
  // Method 1: Use Twilio Verify API (Recommended)
  if (verifyService) {
    try {
      const verification = await verifyService.verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

      logger.info(`OTP sent via Verify API to ${phoneNumber}. Status: ${verification.status}`);
      return {
        success: true,
        mode: "verify_api",
        status: verification.status,
        sid: verification.sid,
      };
    } catch (error) {
      logger.error(`Twilio Verify API error for ${phoneNumber}:`, error);

      if (process.env.NODE_ENV === "development") {
        const otp = generateOTP();
        logger.info(`\n🔐 [VERIFY API FAILED - FALLBACK] OTP for ${phoneNumber}: ${otp}\n`);
        return { success: true, mode: "console_fallback", otp };
      }

      throw error;
    }
  }

  // Method 2: Manual OTP with Messages API (Fallback)
  if (twilioClient) {
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!fromNumber) {
      throw new Error("TWILIO_FROM_NUMBER not configured");
    }

    const otp = generateOTP();

    try {
      const message = await twilioClient.messages.create({
        body: `Your TeeTime Golf verification code is: ${otp}. Valid for 5 minutes.`,
        from: fromNumber,
        to: phoneNumber,
      });

      logger.info(`OTP sent via Messages API to ${phoneNumber}. SID: ${message.sid}`);
      return { success: true, mode: "messages_api", sid: message.sid, otp };
    } catch (error) {
      logger.error(`Twilio Messages API error for ${phoneNumber}:`, error);

      if (process.env.NODE_ENV === "development") {
        logger.info(`\n🔐 [MESSAGES API FAILED - FALLBACK] OTP for ${phoneNumber}: ${otp}\n`);
        return { success: true, mode: "console_fallback", otp };
      }

      throw error;
    }
  }

  // Method 3: Development mode - log OTP to console
  const otp = generateOTP();
  logger.info(`\n🔐 [DEVELOPMENT MODE] OTP for ${phoneNumber}: ${otp}\n`);
  return { success: true, mode: "console", otp };
};

/**
 * Verify OTP via Twilio Verify API
 */
const verifyOTP = async (phoneNumber, otp) => {
  if (!verifyService) {
    return null; // Will use manual verification
  }

  try {
    const verificationCheck = await verifyService.verificationChecks.create({
      to: phoneNumber,
      code: otp,
    });

    logger.info(`OTP verification for ${phoneNumber}. Status: ${verificationCheck.status}`);
    return verificationCheck.status === "approved";
  } catch (error) {
    logger.error(`Twilio Verify check error for ${phoneNumber}:`, error);
    return null; // Will fallback to manual verification
  }
};

/**
 * Send SMS message
 */
const sendSMS = async (phoneNumber, message) => {
  if (!twilioClient) {
    logger.info(`\n📱 [SMS - DEV MODE] to ${phoneNumber}:\n${message}\n`);
    return { success: true, mode: "console" };
  }

  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!fromNumber) {
    throw new Error("TWILIO_FROM_NUMBER not configured");
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber,
    });

    logger.info(`SMS sent to ${phoneNumber}. SID: ${result.sid}`);
    return { success: true, mode: "sms", sid: result.sid };
  } catch (error) {
    logger.error(`Twilio SMS error for ${phoneNumber}:`, error);

    if (process.env.NODE_ENV === "development") {
      logger.info(`\n📱 [SMS FAILED - FALLBACK] to ${phoneNumber}:\n${message}\n`);
      return { success: true, mode: "console_fallback" };
    }

    throw error;
  }
};

/**
 * Get Twilio client instance
 */
const getClient = () => twilioClient;

/**
 * Check if Twilio is configured
 */
const isConfigured = () => !!twilioClient;

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  sendSMS,
  getClient,
  isConfigured,
};
