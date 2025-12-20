const { Router } = require("express");
const { body } = require("express-validator");
// Use modular auth controllers (backward compatible)
const authController = require("../controllers/auth");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");
const rateLimiter = require("../middleware/rateLimiter");
const { logAuthEvent } = require("../middleware/analytics");
const { captureDeviceInfo } = require("../utils/deviceFingerprint");

const router = Router();

/**
 * @route   POST /api/auth/request-otp
 * @desc    Request OTP for phone number
 * @access  Public
 */
router.post(
  "/request-otp",
  captureDeviceInfo,
  [
    body("phoneNumber")
      .trim()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage(
        "Invalid phone number format. Must be E.164 format (+1234567890)"
      ),
  ],
  validateRequest,
  logAuthEvent("otp_requested"),
  authController.requestOTP
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and create session
 * @access  Public
 */
router.post(
  "/verify-otp",
  captureDeviceInfo,
  rateLimiter.otpVerify,
  [
    body("phoneNumber")
      .trim()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage("Invalid phone number format"),
    body("otp")
      .trim()
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage("OTP must be 6 digits"),
  ],
  validateRequest,
  logAuthEvent("otp_verified"),
  authController.verifyOTP
);

/**
 * @route   POST /api/auth/set-password
 * @desc    Set password after OTP verification (signup completion)
 * @access  Public
 */
router.post(
  "/set-password",
  captureDeviceInfo,
  [
    body("phoneNumber")
      .trim()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage("Invalid phone number format"),
    body("password")
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be between 8 and 128 characters"),
  ],
  validateRequest,
  logAuthEvent("password_set"),
  authController.setPassword
);

/**
 * @route   POST /api/auth/login
 * @desc    Login with phone number/username and password
 * @access  Public
 */
router.post(
  "/login",
  captureDeviceInfo,
  rateLimiter.login,
  [
    body("phoneNumber")
      .optional()
      .trim()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage("Invalid phone number format"),
    body("username")
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Username must be between 3 and 50 characters"),
    body("password").trim().notEmpty().withMessage("Password is required"),
    body("rememberMe")
      .optional()
      .isBoolean()
      .withMessage("rememberMe must be a boolean"),
  ],
  validateRequest,
  logAuthEvent("login"),
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  "/refresh",
  rateLimiter.tokenRefresh,
  [
    body("refreshToken")
      .trim()
      .notEmpty()
      .withMessage("Refresh token is required"),
  ],
  validateRequest,
  logAuthEvent("token_refreshed"),
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current session
 * @access  Private
 */
router.post(
  "/logout",
  authenticate,
  logAuthEvent("logout"),
  authController.logout
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post("/logout-all", authenticate, authController.logoutAll);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", authenticate, authController.getCurrentUser);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  authenticate,
  [
    body("firstName").optional().trim().isLength({ min: 1, max: 50 }),
    body("lastName").optional().trim().isLength({ min: 1, max: 50 }),
    body("email").optional().trim().isEmail().normalizeEmail(),
    body("handicap").optional().isInt({ min: 0, max: 54 }),
    body("location").optional().trim().isLength({ max: 100 }),
    body("equipment").optional().isObject(),
    body("preferences").optional().isObject(),
  ],
  validateRequest,
  authController.updateProfile
);

/**
 * @route   POST /api/auth/magic-link
 * @desc    Request magic link for email
 * @access  Public
 */
router.post(
  "/magic-link",
  captureDeviceInfo,
  rateLimiter.magicLink,
  [
    body("email")
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email address"),
  ],
  validateRequest,
  logAuthEvent("magic_link_requested"),
  authController.requestMagicLink
);

/**
 * @route   GET /api/auth/magic-link-redirect
 * @desc    Universal link handler - redirects to app or web
 * @access  Public
 */
router.get("/magic-link-redirect", authController.magicLinkRedirect);

/**
 * @route   GET /api/auth/verify-magic
 * @desc    Verify magic link token (API endpoint for app)
 * @access  Public
 */
router.get(
  "/verify-magic",
  captureDeviceInfo,
  logAuthEvent("magic_link_verified"),
  authController.verifyMagicLink
);

/**
 * @route   POST /api/auth/sms-magic-link
 * @desc    Request magic link via SMS for signup
 * @access  Public
 */
router.post(
  "/sms-magic-link",
  captureDeviceInfo,
  rateLimiter.magicLink,
  [
    body("phoneNumber")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required")
      .matches(/^\+?[1-9]\d{6,14}$/)
      .withMessage("Invalid phone number format"),
  ],
  validateRequest,
  logAuthEvent("sms_magic_link_requested"),
  authController.requestSmsMagicLink
);

/**
 * @route   POST /api/auth/verify-sms-magic
 * @desc    Verify SMS magic link token and complete signup
 * @access  Public
 */
router.post(
  "/verify-sms-magic",
  captureDeviceInfo,
  [body("token").trim().notEmpty().withMessage("Token is required")],
  validateRequest,
  logAuthEvent("sms_magic_link_verified"),
  authController.verifySmsMagicLink
);

/**
 * @route   POST /api/auth/register
 * @desc    Direct user registration (passwordless, no OTP required)
 * @access  Public
 */
router.post(
  "/register",
  captureDeviceInfo,
  [
    body("phoneNumber")
      .trim()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage("Invalid phone number format. Must be E.164 format (+1234567890)"),
    body("firstName")
      .trim()
      .notEmpty()
      .withMessage("First name is required")
      .isLength({ min: 1, max: 50 })
      .withMessage("First name must be between 1 and 50 characters"),
    body("lastName")
      .trim()
      .notEmpty()
      .withMessage("Last name is required")
      .isLength({ min: 1, max: 50 })
      .withMessage("Last name must be between 1 and 50 characters"),
    body("username")
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Username must be between 3 and 50 characters"),
    body("email")
      .optional({ nullable: true })
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email address"),
    body("handicap")
      .optional({ nullable: true })
      .isInt({ min: 0, max: 54 })
      .withMessage("Handicap must be between 0 and 54"),
  ],
  validateRequest,
  logAuthEvent("user_registered"),
  authController.registerUser
);

module.exports = router;
