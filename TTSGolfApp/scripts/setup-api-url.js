#!/usr/bin/env node
/**
 * Set EXPO_PUBLIC_API_URL in .env to this machine's local IP so the
 * simulator/device can reach the backend. Run from TTSGolfApp:
 *   npm run setup:api
 * Then start backend (cd backend && npm run dev) and restart Expo (npx expo start -c).
 */
const fs = require("fs");
const path = require("path");

function getLocalIP() {
  try {
    const os = require("os");
    const nets = os.networkInterfaces();
    if (nets) {
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
          if (net.family === "IPv4" && !net.internal) {
            return net.address;
          }
        }
      }
    }
  } catch (_) {}
  try {
    const { execSync } = require("child_process");
    const isMac = process.platform === "darwin";
    const cmd = isMac ? "ipconfig getifaddr en0" : "hostname -I | awk '{print $1}'";
    const ip = String(execSync(cmd, { encoding: "utf8" })).trim();
    if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
  } catch (_) {}
  return null;
}

const appDir = path.resolve(__dirname, "..");
const envPath = path.join(appDir, ".env");
const examplePath = path.join(appDir, ".env.example");
const port = process.env.BACKEND_PORT || "3000";

const ip = getLocalIP();
if (!ip) {
  console.error("Could not detect local IP. Set EXPO_PUBLIC_API_URL manually in .env");
  process.exit(1);
}

const newUrl = `http://${ip}:${port}`;
const newLine = `EXPO_PUBLIC_API_URL=${newUrl}`;

let content;
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, "utf8");
} else if (fs.existsSync(examplePath)) {
  content = fs.readFileSync(examplePath, "utf8");
  console.log(".env not found; copying from .env.example and setting API URL.");
} else {
  content = "# TeeTime Social - Environment\n" + newLine + "\n";
}

const lineMatch = /^EXPO_PUBLIC_API_URL=.*/m;
if (lineMatch.test(content)) {
  content = content.replace(lineMatch, newLine);
} else {
  content = content.trimEnd() + "\n" + newLine + "\n";
}

fs.writeFileSync(envPath, content, "utf8");
console.log("Updated", envPath);
console.log("  EXPO_PUBLIC_API_URL=" + newUrl);
console.log("");
console.log("Next steps:");
console.log("  1. Start backend:  cd backend && npm run dev");
console.log("  2. Restart Expo:   npx expo start -c");
console.log("  3. Run the app from Xcode or Expo again.");
