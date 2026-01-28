const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const fs = require("fs");

console.log("=== OAuth Configuration Diagnostic ===");

// 1. Google Configuration
console.log("\n[Google OAuth]");
const googleIos = process.env.GOOGLE_CLIENT_ID_IOS;
const googleAndroid = process.env.GOOGLE_CLIENT_ID_ANDROID;
const googleWeb = process.env.GOOGLE_CLIENT_ID_WEB;

if (googleIos) console.log("✅ GOOGLE_CLIENT_ID_IOS is set");
else console.log("❌ GOOGLE_CLIENT_ID_IOS is MISSING");

if (googleAndroid) console.log("✅ GOOGLE_CLIENT_ID_ANDROID is set");
else console.log("❌ GOOGLE_CLIENT_ID_ANDROID is MISSING");

if (googleWeb) console.log("✅ GOOGLE_CLIENT_ID_WEB is set");
else console.log("❌ GOOGLE_CLIENT_ID_WEB is MISSING");

if (!googleIos && !googleAndroid && !googleWeb) {
  console.log(
    "⚠️  At least one Google Client ID must be configured for Google Sign-In to work.",
  );
}

// 2. Apple Configuration
console.log("\n[Apple Sign-In]");
const appleClientId = process.env.APPLE_CLIENT_ID;
const appleTeamId = process.env.APPLE_TEAM_ID;
const appleKeyId = process.env.APPLE_KEY_ID;
const appleKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;
const appleServiceId = process.env.APPLE_SERVICE_ID;

if (appleClientId) console.log(`✅ APPLE_CLIENT_ID is set: ${appleClientId}`);
else console.log("❌ APPLE_CLIENT_ID is MISSING");

if (appleServiceId)
  console.log(`✅ APPLE_SERVICE_ID is set: ${appleServiceId}`);
else console.log("⚠️  APPLE_SERVICE_ID is not set (optional for native apps)");

if (appleTeamId) console.log(`✅ APPLE_TEAM_ID is set: ${appleTeamId}`);
else console.log("❌ APPLE_TEAM_ID is MISSING");

if (appleKeyId) console.log(`✅ APPLE_KEY_ID is set: ${appleKeyId}`);
else console.log("❌ APPLE_KEY_ID is MISSING");

if (appleKeyPath) {
  console.log(`✅ APPLE_PRIVATE_KEY_PATH is set: ${appleKeyPath}`);
  // Check if file exists
  const keyPath = path.resolve(__dirname, "../", appleKeyPath);
  if (fs.existsSync(keyPath)) {
    console.log(`✅ Key file exists at: ${keyPath}`);
    // Check file content
    const keyContent = fs.readFileSync(keyPath, "utf8");
    if (keyContent.includes("BEGIN PRIVATE KEY")) {
      console.log(
        `✅ Key file appears to be valid (contains private key header)`,
      );
    } else {
      console.log(`❌ Key file may be invalid (missing private key header)`);
    }
  } else {
    console.log(`❌ Key file NOT FOUND at: ${keyPath}`);
  }
} else {
  console.log("❌ APPLE_PRIVATE_KEY_PATH is MISSING");
}

console.log("\n=== Diagnosis Complete ===");
