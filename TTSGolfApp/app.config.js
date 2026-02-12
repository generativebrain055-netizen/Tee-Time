const fs = require("fs");
const path = require("path");

const appJson = require("./app.json");
const expoConfig = JSON.parse(JSON.stringify(appJson.expo));

// Only include android.googleServicesFile if the file exists (avoids "Could not parse" when missing)
const googleServicesPath = path.join(__dirname, "google-services.json");
if (!fs.existsSync(googleServicesPath) && expoConfig.android?.googleServicesFile) {
  delete expoConfig.android.googleServicesFile;
}

module.exports = {
  expo: expoConfig,
};
