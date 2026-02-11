/**
 * Production-Grade Logger
 * Intelligent logging that respects environment and log levels
 */

const isDevelopment = __DEV__;

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    // Production: Only errors and warnings
    // Development: All logs
    this.level = isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  /**
   * Log errors - Always logged in production
   */
  error(message: string, error?: any): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error || "");
    }
  }

  /**
   * Log warnings - Logged in production
   */
  warn(message: string, data?: any): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, data || "");
    }
  }

  /**
   * Log info - Development only
   */
  info(message: string, data?: any): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, data || "");
    }
  }

  /**
   * Log debug - Development only
   */
  debug(message: string, data?: any): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, data || "");
    }
  }

  /**
   * Log API calls - Development only
   */
  api(method: string, endpoint: string, data?: any): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`[API] ${method} ${endpoint}`, data || "");
    }
  }

  /**
   * Log authentication events - Development only
   */
  auth(event: string, data?: any): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`[AUTH] ${event}`, data || "");
    }
  }
}

export const logger = new Logger();
export default logger;
