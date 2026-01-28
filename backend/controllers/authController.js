/**
 * Auth Controller (Legacy)
 * 
 * This file has been modularized for better maintainability.
 * All functionality is now split into:
 * 
 * Services:
 * - services/sessionService.js - Session creation, token management
 * - services/twilioService.js - Twilio OTP and SMS operations
 * - services/emailService.js - SendGrid email operations
 * 
 * Controllers:
 * - controllers/auth/otpController.js - OTP request/verification
 * - controllers/auth/loginController.js - Login, logout operations
 * - controllers/auth/tokenController.js - Token refresh
 * - controllers/auth/profileController.js - User profile operations
 * - controllers/auth/registerController.js - User registration
 * - controllers/auth/magicLinkController.js - Magic link authentication
 * - controllers/auth/index.js - Re-exports all functions
 * 
 * This file re-exports from the modular structure for backward compatibility.
 */

module.exports = require("./auth");
