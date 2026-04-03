/**
 * Twilio config stored in Firestore (config/twilio).
 * twilioService reads Firestore first, then falls back to TWILIO_* env vars.
 * Manage via admin dashboard → Settings. Only server-side Firebase Admin should access this document.
 */
const admin = require("../config/firebaseAdmin");
const logger = require("../config/logger");

const COLLECTION = "config";
const DOC_ID = "twilio";

function getFirestore() {
  return admin.firestore();
}

/**
 * Get Twilio config from Firestore. Returns null if doc missing or empty.
 * @returns {Promise<{ accountSid?: string, authToken?: string, fromNumber?: string, messagingServiceSid?: string, apiKeySid?: string, apiKeySecret?: string, verifyServiceSid?: string } | null>}
 */
async function getTwilioConfigFromFirestore() {
  try {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!doc.exists) return null;
    const data = doc.data() || {};
    const accountSid = typeof data.accountSid === "string" ? data.accountSid.trim() : "";
    const authToken = typeof data.authToken === "string" ? data.authToken.trim() : "";
    const fromNumber = typeof data.fromNumber === "string" ? data.fromNumber.trim() : "";
    const messagingServiceSid =
      typeof data.messagingServiceSid === "string" ? data.messagingServiceSid.trim() : "";
    if (!accountSid && !authToken && !fromNumber && !messagingServiceSid) return null;
    return {
      accountSid: accountSid || undefined,
      authToken: authToken || undefined,
      fromNumber: fromNumber || undefined,
      messagingServiceSid:
        messagingServiceSid && messagingServiceSid.startsWith("MG")
          ? messagingServiceSid
          : undefined,
      apiKeySid: typeof data.apiKeySid === "string" ? data.apiKeySid.trim() || undefined : undefined,
      apiKeySecret: typeof data.apiKeySecret === "string" ? data.apiKeySecret.trim() || undefined : undefined,
      verifyServiceSid: typeof data.verifyServiceSid === "string" ? data.verifyServiceSid.trim() || undefined : undefined,
    };
  } catch (err) {
    const msg = err?.message || "";
    const isCreds = msg.includes("default credentials") || msg.includes("credential");
    logger.warn("[twilioConfig] Firestore read failed", {
      error: msg,
      hint: isCreds ? "Set GOOGLE_APPLICATION_CREDENTIALS in backend .env to your Firebase service account JSON path." : undefined,
    });
    return null;
  }
}

/**
 * Write Twilio config to Firestore. Only pass fields to update; do not log or return raw secrets.
 * @param { { accountSid?: string, authToken?: string, fromNumber?: string, messagingServiceSid?: string, apiKeySid?: string, apiKeySecret?: string, verifyServiceSid?: string } } config
 */
async function setTwilioConfigInFirestore(config) {
  const db = getFirestore();
  const ref = db.collection(COLLECTION).doc(DOC_ID);
  const data = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  const keys = [
    "accountSid",
    "authToken",
    "fromNumber",
    "messagingServiceSid",
    "apiKeySid",
    "apiKeySecret",
    "verifyServiceSid",
  ];
  for (const k of keys) {
    if (typeof config[k] === "string" && config[k].trim() !== "") data[k] = config[k].trim();
  }
  await ref.set(data, { merge: true });
  logger.info("[twilioConfig] Twilio config saved to Firestore");
}

/**
 * Delete the Twilio config document from Firestore so the backend falls back to .env TWILIO_* vars.
 */
async function clearTwilioConfigInFirestore() {
  const db = getFirestore();
  await db.collection(COLLECTION).doc(DOC_ID).delete();
  logger.info("[twilioConfig] Twilio config cleared from Firestore (will fall back to .env)");
}

module.exports = {
  getTwilioConfigFromFirestore,
  setTwilioConfigInFirestore,
  clearTwilioConfigInFirestore,
};
