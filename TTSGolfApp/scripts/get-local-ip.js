#!/usr/bin/env node
/**
 * Print this machine's local IP (for EXPO_PUBLIC_API_URL in .env).
 * Run from TTSGolfApp: node scripts/get-local-ip.js
 * Then set in .env: EXPO_PUBLIC_API_URL=http://<that-IP>:3000
 */
const os = require("os");
try {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        console.log(net.address);
        process.exit(0);
      }
    }
  }
} catch (e) {
  console.error("Could not get IP:", e.message);
}
console.error("No local IPv4 found. Use: System Settings → Network → your connection → IP address");
process.exit(1);
