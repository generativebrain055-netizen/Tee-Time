const rateLimit = require("express-rate-limit");
const { RateLimitError } = require("./errorHandler");

/**
 * Rate Limiter Middleware
 * Protects endpoints from abuse
 */

/**
 * Create rate limiter with custom config
 */
const createLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100,
    message: options.message || "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = Math.ceil(options.windowMs / 1000);
      throw new RateLimitError(options.message, retryAfter);
    },
    skip: (req) => {
      // Skip rate limiting for whitelisted IPs (optional)
      const whitelist = (process.env.RATE_LIMIT_WHITELIST || "").split(",");
      return whitelist.includes(req.ip);
    },
  });
};

/**
 * OTP Request Rate Limiter
 * 5 requests per hour per phone number
 */
const otpRequest = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.OTP_RATE_LIMIT_PER_HOUR || "5", 10),
  message: "Too many OTP requests. Please try again later",
  keyGenerator: (req) => {
    // Rate limit by phone number + IP
    return `otp:${req.body.phoneNumber || req.ip}`;
  },
});

/**
 * OTP Verification Rate Limiter
 * 10 attempts per 15 minutes
 */
const otpVerify = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many verification attempts. Please try again later",
  keyGenerator: (req) => `verify:${req.body.phoneNumber || req.ip}`,
});

/**
 * Login Rate Limiter
 * 10 attempts per 15 minutes per phone/IP
 */
const login = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again later",
  keyGenerator: (req) => `login:${req.body.phoneNumber || req.ip}`,
});

/**
 * Magic Link Rate Limiter
 * 10 requests per hour per email/phone
 */
const magicLink = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many magic link requests. Please try again later",
  keyGenerator: (req) => `magic:${req.body.email || req.body.phoneNumber || req.ip}`,
});

/**
 * Token Refresh Rate Limiter
 * 20 requests per hour
 */
const tokenRefresh = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many refresh requests. Please try again later",
});

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP. Please try again later",
});

/**
 * Strict Rate Limiter for sensitive operations
 * 5 requests per hour
 */
const strictLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Rate limit exceeded for this operation",
});

module.exports = {
  otpRequest,
  otpVerify,
  login,
  magicLink,
  tokenRefresh,
  apiLimiter,
  strictLimiter,
};
