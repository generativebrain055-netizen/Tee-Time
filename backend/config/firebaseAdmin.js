/**
 * Single place to initialize Firebase Admin SDK.
 * Used by oauthService (Google Auth) and twilioConfigService (Firestore for Twilio).
 * Set GOOGLE_APPLICATION_CREDENTIALS in .env to the path of your Firebase service account JSON.
 */
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const logger = require("./logger");

function initializeFirebaseAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || "teetime-db29d";
  let credential = null;

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath) {
    const resolved = path.isAbsolute(credPath)
      ? credPath
      : path.resolve(__dirname, "..", credPath);
    try {
      const key = JSON.parse(fs.readFileSync(resolved, "utf8"));
      credential = admin.credential.cert(key);
      if (process.env.NODE_ENV !== "test") {
        logger.info("[Firebase] Using credentials from GOOGLE_APPLICATION_CREDENTIALS");
      }
    } catch (err) {
      logger.warn("[Firebase] Could not load credential file; Firestore and Google Auth will fail until you set GOOGLE_APPLICATION_CREDENTIALS to a valid service account JSON path.", {
        path: resolved,
        error: err?.message,
      });
    }
  }

  if (!credential) {
    logger.warn("[Firebase] GOOGLE_APPLICATION_CREDENTIALS not set or file not loadable. Add it to backend .env (e.g. GOOGLE_APPLICATION_CREDENTIALS=./config/firebase-service-account.json) and download a service account key from Firebase Console → Project settings → Service accounts.");
  }

  const options = { projectId };
  if (credential) options.credential = credential;
  admin.initializeApp(options);
}

initializeFirebaseAdmin();

module.exports = admin;
