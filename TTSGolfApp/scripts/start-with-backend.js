#!/usr/bin/env node
/**
 * Start backend then Expo so the app can connect. Run from TTSGolfApp:
 *   npm run start:with-backend
 * Uses one terminal: backend runs in background, Expo in foreground.
 */
const path = require("path");
const { spawn } = require("child_process");

const appDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(appDir, "..", "backend");

console.log("Starting backend at", backendDir);
const backend = spawn("npm", ["run", "dev"], {
  cwd: backendDir,
  stdio: "inherit",
  shell: true,
});

backend.on("error", (err) => {
  console.error("Failed to start backend:", err.message);
  process.exit(1);
});

backend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error("Backend exited with code", code);
    process.exit(code);
  }
});

// Wait for backend to listen then start Expo
const delay = 5000;
console.log("Waiting " + delay / 1000 + "s for backend to start...");
setTimeout(() => {
  console.log("Starting Expo...");
  const expo = spawn("npx", ["expo", "start", "-c"], {
    cwd: appDir,
    stdio: "inherit",
    shell: true,
  });
  expo.on("exit", (code) => {
    backend.kill("SIGTERM");
    process.exit(code !== null ? code : 0);
  });
}, delay);
