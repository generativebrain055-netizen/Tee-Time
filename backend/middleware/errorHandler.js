const logger = require("../config/logger");

/**
 * Application Errors
 * Custom error classes for different error types
 */

/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}

/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
  constructor(message = "Validation failed", details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/**
 * Authentication Error (401)
 */
class AuthenticationError extends AppError {
  constructor(message = "Authentication failed", code = "AUTH_FAILED") {
    super(message, 401, code);
  }
}

/**
 * Authorization Error (403)
 */
class AuthorizationError extends AppError {
  constructor(message = "Access denied", code = "ACCESS_DENIED") {
    super(message, 403, code);
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
  constructor(message = "Resource not found", resource = null) {
    super(message, 404, "NOT_FOUND", resource ? { resource } : null);
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
  constructor(message = "Resource already exists", details = null) {
    super(message, 409, "CONFLICT", details);
  }
}

/**
 * Rate Limit Error (429)
 */
class RateLimitError extends AppError {
  constructor(message = "Too many requests", retryAfter = null) {
    super(
      message,
      429,
      "RATE_LIMIT_EXCEEDED",
      retryAfter ? { retryAfter } : null
    );
  }
}

/**
 * Internal Server Error (500)
 */
class InternalServerError extends AppError {
  constructor(message = "Internal server error", details = null) {
    super(message, 500, "INTERNAL_ERROR", details);
  }
}

/**
 * Database Error (500)
 */
class DatabaseError extends AppError {
  constructor(message = "Database operation failed", details = null) {
    super(message, 500, "DATABASE_ERROR", details);
  }
}

/**
 * External Service Error (502)
 */
class ExternalServiceError extends AppError {
  constructor(service, message = "External service unavailable") {
    super(message, 502, "EXTERNAL_SERVICE_ERROR", { service });
  }
}

/**
 * Common security scan paths that should be logged at lower level
 */
const SECURITY_SCAN_PATTERNS = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.github/i,
  /^\/\.gitlab/i,
  /^\/\.ssh/i,
  /^\/\.htaccess/i,
  /^\/\.well-known/i,
  /^\/\.vscode/i,
  /^\/\.idea/i,
  /^\/\.npmrc/i,
  /^\/\.travis/i,
  /^\/\.gitignore/i,
  /^\/\.gitlab-ci/i,
  /^\/\.hg/i,
  /^\/\.svn/i,
  /^\/\.next/i,
  /^\/\.nuxt/i,
  /^\/\.vite/i,
  /^\/\.local/i,
  /^\/\.production/i,
  /^\/\.remote/i,
  /^\/\.phpinfo/i,
  /^\/\.pypirc/i,
];

/**
 * Check if a path matches security scan patterns
 */
const isSecurityScanPath = (path) => {
  return SECURITY_SCAN_PATTERNS.some(pattern => pattern.test(path));
};

/**
 * Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  const isSecurityScan = isSecurityScanPath(req.path);
  const isNotFound = err.statusCode === 404;
  
  // For 404s on security scan paths, log at info level instead of error
  // These are common bot/scanner requests and not actual errors
  if (isNotFound && isSecurityScan) {
    logger.info("Security scan attempt blocked", {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  } else {
    // Log actual errors
    logger.error("Error occurred", {
      error: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      code: err.code,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Determine if we should send error details
  const isDevelopment = process.env.NODE_ENV === "development";

  // Construct error response
  const errorResponse = {
    success: false,
    error: {
      message: err.message || "An error occurred",
      code: err.code || "UNKNOWN_ERROR",
      ...(isDevelopment && { stack: err.stack }),
      ...(err.details && { details: err.details }),
    },
  };

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error Code Constants
 */
const ErrorCodes = {
  // Authentication
  AUTH_FAILED: "AUTH_FAILED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_NOT_VERIFIED: "ACCOUNT_NOT_VERIFIED",

  // OTP
  OTP_INVALID: "OTP_INVALID",
  OTP_EXPIRED: "OTP_EXPIRED",
  OTP_MAX_ATTEMPTS: "OTP_MAX_ATTEMPTS",
  OTP_RATE_LIMIT: "OTP_RATE_LIMIT",

  // Magic Link
  MAGIC_LINK_INVALID: "MAGIC_LINK_INVALID",
  MAGIC_LINK_EXPIRED: "MAGIC_LINK_EXPIRED",
  MAGIC_LINK_USED: "MAGIC_LINK_USED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_PHONE_NUMBER: "INVALID_PHONE_NUMBER",
  INVALID_EMAIL: "INVALID_EMAIL",
  WEAK_PASSWORD: "WEAK_PASSWORD",

  // Resource
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // System
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
  ExternalServiceError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ErrorCodes,
};
