// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable Watchman so Metro does not wait on startup. Uses node file crawler instead.
config.watchman = false;
config.resolver = config.resolver || {};
config.resolver.useWatchman = false;

const finalConfig = withNativeWind(config, { input: "./global.css" });
finalConfig.watchman = false;
finalConfig.resolver = finalConfig.resolver || {};
finalConfig.resolver.useWatchman = false;
module.exports = finalConfig;
