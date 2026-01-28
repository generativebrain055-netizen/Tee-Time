/**
 * Middleware Index
 * Re-exports all middleware for cleaner imports
 */

const analytics = require("./analytics");
const { authenticateToken, optionalAuth } = require("./auth");
const {
  errorHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
} = require("./errorHandler");
const rateLimiter = require("./rateLimiter");
const validator = require("./validator");

module.exports = {
  // Analytics
  analytics,

  // Authentication
  authenticateToken,
  optionalAuth,

  // Error Handling
  errorHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,

  // Rate Limiting
  rateLimiter,

  // Validation
  validator,
};
