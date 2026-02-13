/**
 * Expo config plugin: avoid "empty dSYM file" warning in Debug builds
 * by using DWARF-only (no dSYM) for Debug configuration.
 * Run `npx expo prebuild --clean` to apply; then build from Xcode.
 */
let withXcodeProject;
try {
  withXcodeProject = require("expo/config-plugins").withXcodeProject;
} catch (_) {
  withXcodeProject = () => (c) => c;
}

function withIosNoEmptyDsym(config) {
  return withXcodeProject(config, async (config) => {
    try {
      const xcodeProject = config.modResults;
      const configurations = xcodeProject.pbxXCBuildConfigurationSection() || {};
      const keys = Object.keys(configurations).filter(
        (k) => typeof configurations[k] === "object" && configurations[k].buildSettings
      );
      for (const key of keys) {
        const buildSettings = configurations[key].buildSettings;
        if (!buildSettings) continue;
        const isDebug =
          (buildSettings.CONFIGURATION_BUILD_DIR && String(buildSettings.CONFIGURATION_BUILD_DIR).includes("Debug")) ||
          (buildSettings.CONFIGURATION && String(buildSettings.CONFIGURATION).includes("Debug"));
        if (isDebug) {
          buildSettings.DEBUG_INFORMATION_FORMAT = "dwarf";
        }
      }
    } catch (_) {}
    return config;
  });
}

module.exports = withIosNoEmptyDsym;
