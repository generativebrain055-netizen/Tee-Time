const twilio = require("twilio");
const crypto = require("crypto");
const logger = require("../config/logger");
const { twilioLogger } = require("../config/logger");

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
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  logger.info("[TWILIO INIT] Checking credentials...", {
    hasAccountSid: !!accountSid,
    hasAuthToken: !!authToken,
    hasApiKeySid: !!apiKeySid,
    hasApiKeySecret: !!apiKeySecret,
    accountSidPrefix: accountSid?.substring(0, 2),
  });

  // Check if using API Key authentication
  if (apiKeySid && apiKeySecret && accountSid) {
    if (!accountSid.startsWith("AC")) {
      logger.warn("TWILIO_ACCOUNT_SID must start with AC. SMS features will be disabled.");
      return { client: null, verify: null };
    }

    try {
      // Use API Key authentication
      logger.info("[TWILIO INIT] Initializing with API Key authentication...");
      const client = twilio(apiKeySid, apiKeySecret, { accountSid });
      const verify = verifyServiceSid ? client.verify.v2.services(verifyServiceSid) : null;

      if (!verify) {
        logger.info("TWILIO_VERIFY_SERVICE_SID not configured. Using manual OTP method.");
      } else {
        logger.info("Twilio initialized with API Key authentication and Verify service.");
      }

      logger.info("[TWILIO INIT] Successfully initialized with API Key!");
      twilioLogger.info("[TWILIO INIT] Initialized with API Key", { verify: !!verifyServiceSid });
      return { client, verify };
    } catch (error) {
      logger.error("Failed to initialize Twilio with API Key:", error);
      twilioLogger.warn("[TWILIO INIT] API Key init failed", { error: error?.message });
      return { client: null, verify: null };
    }
  }

  // Fallback to Auth Token authentication
  if (!accountSid || !authToken) {
    logger.warn("Twilio credentials not configured - SMS features will be disabled");
    twilioLogger.warn("[TWILIO INIT] Not configured - no credentials");
    return { client: null, verify: null };
  }

  if (!accountSid.startsWith("AC")) {
    logger.warn("TWILIO_ACCOUNT_SID appears to be an API Key (SK) instead of Account SID (AC). Using fallback OTP method.");
    return { client: null, verify: null };
  }

  try {
    logger.info("[TWILIO INIT] Initializing with Auth Token authentication...");
    const client = twilio(accountSid, authToken);
    const verify = verifyServiceSid ? client.verify.v2.services(verifyServiceSid) : null;

    if (!verify) {
      logger.warn("TWILIO_VERIFY_SERVICE_SID not configured. Using fallback OTP method.");
    }

    logger.info("[TWILIO INIT] Successfully initialized with Auth Token!");
    twilioLogger.info("[TWILIO INIT] Initialized with Auth Token", { verify: !!verifyServiceSid });
    return { client, verify };
  } catch (error) {
    logger.error("Failed to initialize Twilio client:", error);
    twilioLogger.warn("[TWILIO INIT] Auth Token init failed", { error: error?.message });
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
      twilioLogger.info("[TWILIO] OTP sent via Verify API", {
        feature: "otp",
        to: phoneNumber,
        status: verification.status,
        sid: verification.sid,
      });
      return {
        success: true,
        mode: "verify_api",
        status: verification.status,
        sid: verification.sid,
      };
    } catch (error) {
      logger.error(`Twilio Verify API error for ${phoneNumber}:`, error);
      twilioLogger.warn("[TWILIO] OTP Verify API error", {
        feature: "otp",
        to: phoneNumber,
        error: error?.message,
      });

      if (process.env.NODE_ENV === "development") {
        const otp = generateOTP();
        logger.info(`[VERIFY API FAILED - FALLBACK] OTP for ${phoneNumber}: ${otp}`);
        twilioLogger.info("[TWILIO] OTP dev fallback (Verify API failed)", {
          feature: "otp",
          to: phoneNumber,
          mode: "console_fallback",
        });
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
      twilioLogger.info("[TWILIO] OTP sent via Messages API", {
        feature: "otp",
        to: phoneNumber,
        sid: message.sid,
      });
      return { success: true, mode: "messages_api", sid: message.sid, otp };
    } catch (error) {
      logger.error(`Twilio Messages API error for ${phoneNumber}:`, error);
      twilioLogger.warn("[TWILIO] OTP Messages API error", {
        feature: "otp",
        to: phoneNumber,
        error: error?.message,
      });

      if (process.env.NODE_ENV === "development") {
        logger.info(`[MESSAGES API FAILED - FALLBACK] OTP for ${phoneNumber}: ${otp}`);
        twilioLogger.info("[TWILIO] OTP dev fallback (Messages API failed)", {
          feature: "otp",
          to: phoneNumber,
          mode: "console_fallback",
        });
        return { success: true, mode: "console_fallback", otp };
      }

      throw error;
    }
  }

  // Method 3: Development mode - log OTP to console
  const otp = generateOTP();
  logger.info(`[DEVELOPMENT MODE] OTP for ${phoneNumber}: ${otp}`);
  twilioLogger.info("[TWILIO] OTP dev mode (no Twilio)", { feature: "otp", to: phoneNumber, mode: "console" });
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
    twilioLogger.info("[TWILIO] OTP verified", {
      feature: "otp_verify",
      to: phoneNumber,
      status: verificationCheck.status,
    });
    return verificationCheck.status === "approved";
  } catch (error) {
    logger.error(`Twilio Verify check error for ${phoneNumber}:`, error);
    twilioLogger.warn("[TWILIO] OTP verify error", {
      feature: "otp_verify",
      to: phoneNumber,
      error: error?.message,
    });
    return null; // Will fallback to manual verification
  }
};

/**
 * Send SMS message
 */
const sendSMS = async (phoneNumber, message) => {
  if (!twilioClient) {
    logger.info(`[SMS - DEV MODE] to ${phoneNumber}: ${message}`);
    twilioLogger.info("[TWILIO] SMS dev mode (no Twilio)", {
      feature: "sms",
      to: phoneNumber,
      mode: "console",
      bodyPreview: message.slice(0, 80),
    });
    return { success: true, mode: "console" };
  }

  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!fromNumber) {
    twilioLogger.warn("[TWILIO] SMS skipped - TWILIO_FROM_NUMBER not configured", {
      feature: "sms",
      to: phoneNumber,
    });
    throw new Error("TWILIO_FROM_NUMBER not configured");
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber,
    });

    logger.info(`SMS sent to ${phoneNumber}. SID: ${result.sid}`);
    twilioLogger.info("[TWILIO] SMS sent", {
      feature: "sms",
      to: phoneNumber,
      sid: result.sid,
      bodyPreview: message.slice(0, 80),
    });
    return { success: true, mode: "sms", sid: result.sid };
  } catch (error) {
    logger.error(`Twilio SMS error for ${phoneNumber}:`, error);
    twilioLogger.warn("[TWILIO] SMS send failed", {
      feature: "sms",
      to: phoneNumber,
      error: error?.message,
      bodyPreview: message.slice(0, 80),
    });

    if (process.env.NODE_ENV === "development") {
      logger.info(`[SMS FAILED - FALLBACK] to ${phoneNumber}: ${message}`);
      twilioLogger.info("[TWILIO] SMS dev fallback (send failed)", {
        feature: "sms",
        to: phoneNumber,
        mode: "console_fallback",
        bodyPreview: message.slice(0, 80),
      });
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
