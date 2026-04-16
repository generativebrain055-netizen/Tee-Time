/**
 * Writes android/local.properties `node.executable` to the Node binary that ran this script.
 * Android Studio's Gradle daemon often has no Homebrew/nvm on PATH; Gradle reads this property instead.
 */
const fs = require("fs");
const path = require("path");

const androidDir = path.join(__dirname, "..", "android");
const lpPath = path.join(androidDir, "local.properties");

function main() {
  const nodePath = process.execPath;
  if (!nodePath || !fs.existsSync(nodePath)) return;
  if (!fs.existsSync(androidDir)) return;

  let lines = [];
  if (fs.existsSync(lpPath)) {
    lines = fs
      .readFileSync(lpPath, "utf8")
      .split(/\r?\n/)
      .filter((l) => !/^\s*node\.executable\s*=/.test(l));
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
  }
  lines.push(`node.executable=${nodePath}`);
  fs.writeFileSync(lpPath, `${lines.join("\n")}\n`, "utf8");
}

main();
