/**
 * Configurable logging layer for production
 * In development: logs debug, info, warn, error
 * In production: logs only warn and error (unless EXPO_PUBLIC_LOG_LEVEL=debug)
 */

const isDev = __DEV__;
const logLevel = process.env.EXPO_PUBLIC_LOG_LEVEL || (isDev ? "debug" : "warn");

const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const;
const currentLevel = levels[logLevel as keyof typeof levels] ?? levels.info;

const shouldLog = (level: keyof typeof levels) => levels[level] >= currentLevel;

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog("debug")) {
      // eslint-disable-next-line no-console
      console.log("[TTS]", ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog("info")) {
      // eslint-disable-next-line no-console
      console.log("[TTS]", ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog("warn")) {
      // eslint-disable-next-line no-console
      console.warn("[TTS]", ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (shouldLog("error")) {
      // eslint-disable-next-line no-console
      console.error("[TTS]", ...args);
    }
  },
};
