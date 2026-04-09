const fs = require("fs");
const path = require("path");

const appJson = require("./app.json");
const expoConfig = JSON.parse(JSON.stringify(appJson.expo));

// Only include android.googleServicesFile if the file exists (avoids "Could not parse" when missing).
// Without this file, native Android Google Sign-In / Firebase Auth will not match your Firebase OAuth clients.
const googleServicesPath = path.join(__dirname, "google-services.json");
if (!fs.existsSync(googleServicesPath) && expoConfig.android?.googleServicesFile) {
  // eslint-disable-next-line no-console
  console.warn(
    "[app.config] google-services.json not found next to app.json. Android Google Sign-In requires this file from Firebase; add it and run prebuild again.",
  );
  delete expoConfig.android.googleServicesFile;
}

// Sign in with Apple requires a paid Apple Developer account. For local/simulator dev with a free
// Apple ID, set EXPO_NO_APPLE_SIGNIN=1 and run prebuild --clean so the iOS project has no Apple
// Sign In capability. Remove this env var (and prebuild --clean again) when using a paid team.
if (process.env.EXPO_NO_APPLE_SIGNIN === "1" && expoConfig.ios?.usesAppleSignIn) {
  delete expoConfig.ios.usesAppleSignIn;
}

module.exports = {
  expo: expoConfig,
};
