#!/usr/bin/env node
/**
 * Fetch Figma file data via the Figma REST API.
 *
 * Prerequisites:
 * 1. Create a Figma personal access token:
 *    - Figma → Settings → Account → Personal access tokens → Generate new token
 *    - Scope needed: file_content:read (or full access)
 * 2. Set the token when running:
 *    FIGMA_ACCESS_TOKEN=your_token node scripts/figma-get-file.js
 *
 * Optional: FIGMA_FILE_KEY (defaults to Tee Time Social file from docs)
 * Output: writes JSON to docs/figma-file-export.json, or pass --stdout to print.
 */

const fs = require("fs");
const path = require("path");

const FIGMA_API = "https://api.figma.com/v1";
const DEFAULT_FILE_KEY = "E42NRKunR1HIcTEJzwPAyT"; // Tee Time Social (from docs/FIGMA_REFERENCE.md)
const OUT_PATH = path.join(__dirname, "..", "docs", "figma-file-export.json");

async function getFigmaFile(fileKey, token) {
  const url = `${FIGMA_API}/files/${fileKey}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Figma-Token": token,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function main() {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  const fileKey = process.env.FIGMA_FILE_KEY || DEFAULT_FILE_KEY;
  const stdout = process.argv.includes("--stdout");

  if (!token) {
    console.error("Missing FIGMA_ACCESS_TOKEN. Set it and run again:");
    console.error("  FIGMA_ACCESS_TOKEN=your_token node scripts/figma-get-file.js");
    process.exit(1);
  }

  try {
    console.error("Fetching Figma file:", fileKey);
    const data = await getFigmaFile(fileKey, token);

    const json = JSON.stringify(data, null, 2);

    if (stdout) {
      console.log(json);
    } else {
      const dir = path.dirname(OUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUT_PATH, json, "utf8");
      console.error("Wrote:", OUT_PATH);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

main();
