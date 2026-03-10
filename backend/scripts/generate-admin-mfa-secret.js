/**
 * Generate a TOTP secret for admin MFA.
 * Run from backend: node scripts/generate-admin-mfa-secret.js
 * Add the printed SUPER_ADMIN_MFA_SECRET to your .env, then scan the otpauth URL
 * with Google Authenticator (or use an online QR generator with the URL).
 */
const speakeasy = require("speakeasy");
const path = require("path");

// Optional: use admin email from .env for the otpauth label
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const label = process.env.SUPER_ADMIN_EMAIL || "Tee Time Admin";

const secret = speakeasy.generateSecret({
  name: label,
  length: 20,
});

console.log("\n--- Admin MFA secret (add to .env) ---\n");
console.log("SUPER_ADMIN_MFA_SECRET=" + secret.base32);
console.log("\n--- Scan with authenticator app ---\n");
console.log(secret.otpauth_url);
console.log("\nOr open this URL in a QR code generator, then scan the QR with Google Authenticator.");
console.log("After adding to .env, restart the backend and log in with email/password + 6-digit code.\n");
