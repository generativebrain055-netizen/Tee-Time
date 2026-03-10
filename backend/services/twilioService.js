const twilio = require("twilio");
const crypto = require("crypto");
const logger = require("../config/logger");
const { twilioLogger } = require("../config/logger");
const twilioConfigService = require("./twilioConfigService");

/**
 * Twilio Service
 * Credentials: Firestore only (config/twilio). Manage via admin Settings page.
 * Handles OTP and SMS.
 */

let cached = { credsKey: null, client: null, verify: null };

/**
 * Get Twilio config from Firestore. No .env fallback; Twilio is managed in Firestore.
 * @returns {Promise<{ accountSid?: string, authToken?: string, fromNumber?: string, apiKeySid?: string, apiKeySecret?: string, verifyServiceSid?: string }>}
 */
async function getCredentials() {
  const fromFirestore = await twilioConfigService.getTwilioConfigFromFirestore();
  return fromFirestore || {};
}

/**
 * Build Twilio client and verify service from credentials object.
 */
function buildClientFromCreds(creds) {
  const { accountSid, authToken, apiKeySid, apiKeySecret, verifyServiceSid } = creds;

  if (apiKeySid && apiKeySecret && accountSid) {
    if (!accountSid.startsWith("AC")) {
      logger.warn("TWILIO account SID must start with AC. SMS features disabled.");
      return { client: null, verify: null };
    }
    try {
      const client = twilio(apiKeySid, apiKeySecret, { accountSid });
      const verify = verifyServiceSid ? client.verify.v2.services(verifyServiceSid) : null;
      return { client, verify };
    } catch (error) {
      logger.error("Failed to initialize Twilio with API Key:", error);
      return { client: null, verify: null };
    }
  }

  if (!accountSid || !authToken) return { client: null, verify: null };
  if (!accountSid.startsWith("AC")) {
    logger.warn("TWILIO account SID must start with AC. SMS features disabled.");
    return { client: null, verify: null };
  }
  try {
    const client = twilio(accountSid, authToken);
    const verify = verifyServiceSid ? client.verify.v2.services(verifyServiceSid) : null;
    return { client, verify };
  } catch (error) {
    logger.error("Failed to initialize Twilio client:", error);
    return { client: null, verify: null };
  }
}

/**
 * Cache key from creds (no secrets).
 */
function credsKey(creds) {
  return [creds.accountSid || "", creds.fromNumber || ""].join("|");
}

/**
 * Get Twilio client and verify service (async). Uses Firestore then env, caches by accountSid+fromNumber.
 */
async function getClientAsync() {
  const creds = await getCredentials();
  const key = credsKey(creds);
  if (cached.credsKey === key && (cached.client || cached.verify !== undefined)) {
    return { client: cached.client, verify: cached.verify };
  }
  const { client, verify } = buildClientFromCreds(creds);
  cached = { credsKey: key, client, verify };
  if (client && !cached.credsKey) {
    logger.info("[TWILIO] Client initialized (Firestore or env)");
  }
  return { client, verify };
}

/**
 * Clear cached client so next call re-reads Firestore/env. Call after admin saves Twilio to Firestore.
 */
function clearCache() {
  cached = { credsKey: null, client: null, verify: null };
}

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
  const { client: twilioClient, verify: verifyService } = await getClientAsync();
  const creds = await getCredentials();

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
        return { success: true, mode: "console_fallback", otp };
      }
      throw error;
    }
  }

  if (twilioClient) {
    const fromNumber = creds.fromNumber;
    if (!fromNumber) throw new Error("Twilio from number not configured");
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
      if (process.env.NODE_ENV === "development") {
        logger.info(`[MESSAGES API FAILED - FALLBACK] OTP for ${phoneNumber}: ${otp}`);
        return { success: true, mode: "console_fallback", otp };
      }
      throw error;
    }
  }

  const otp = generateOTP();
  logger.info(`[DEVELOPMENT MODE] OTP for ${phoneNumber}: ${otp}`);
  twilioLogger.info("[TWILIO] OTP dev mode (no Twilio)", { feature: "otp", to: phoneNumber, mode: "console" });
  return { success: true, mode: "console", otp };
};

/**
 * Verify OTP via Twilio Verify API
 */
const verifyOTP = async (phoneNumber, otp) => {
  const { verify: verifyService } = await getClientAsync();
  if (!verifyService) return null;
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
    return null;
  }
};

/**
 * Send SMS message
 */
const sendSMS = async (phoneNumber, message) => {
  const { client: twilioClient } = await getClientAsync();
  const creds = await getCredentials();

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

  const fromNumber = creds.fromNumber;
  if (!fromNumber) {
    twilioLogger.warn("[TWILIO] SMS skipped - from number not configured", {
      feature: "sms",
      to: phoneNumber,
    });
    throw new Error("Twilio from number not configured");
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
 * Get Twilio client instance (async). Prefer getClientAsync for internal use.
 */
const getClient = async () => {
  const { client } = await getClientAsync();
  return client;
};

/**
 * Check if Twilio is configured (async). Uses Firestore then env.
 */
const isConfiguredAsync = async () => {
  const creds = await getCredentials();
  const hasAuth =
    (creds.accountSid && creds.authToken && creds.accountSid.startsWith("AC")) ||
    (creds.accountSid && creds.apiKeySid && creds.apiKeySecret && creds.accountSid.startsWith("AC"));
  return !!(hasAuth && creds.fromNumber);
};

/** @deprecated Use isConfiguredAsync. Sync version returns false until first async load. */
const isConfigured = () => false;

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  sendSMS,
  getClient,
  getClientAsync,
  getCredentials,
  isConfigured,
  isConfiguredAsync,
  clearCache,
};
