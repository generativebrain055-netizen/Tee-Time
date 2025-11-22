const { Router } = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");
const rateLimiter = require("../middleware/rateLimiter");

const router = Router();

/**
 * @route   POST /api/auth/request-otp
 * @desc    Request OTP for phone number
 * @access  Public
 */
router.post(
  "/request-otp",
  rateLimiter.otpRequest,
  [
    body("phoneNumber")
      .trim()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage(
        "Invalid phone number format. Must be E.164 format (+1234567890)"
      ),
  ],
  validateRequest,
  authController.requestOTP
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and create session
 * @access  Public
 */
router.post(
  "/verify-otp",
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
  authController.verifyOTP
);

/**
 * @route   POST /api/auth/set-password
 * @desc    Set password after OTP verification
 * @access  Private (OTP session token required)
 */
router.post(
  "/set-password",
  authenticate,
  [
    body("password")
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be between 8 and 128 characters")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must contain at least one uppercase, lowercase, number, and special character"
      ),
  ],
  validateRequest,
  authController.setPassword
);

/**
 * @route   POST /api/auth/login
 * @desc    Login with phone number and password
 * @access  Public
 */
router.post(
  "/login",
  rateLimiter.login,
  [
    body("phoneNumber")
      .trim()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage("Invalid phone number format"),
    body("password").trim().notEmpty().withMessage("Password is required"),
    body("rememberMe")
      .optional()
      .isBoolean()
      .withMessage("rememberMe must be a boolean"),
  ],
  validateRequest,
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
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current session
 * @access  Private
 */
router.post("/logout", authenticate, authController.logout);

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
 * @route   POST /api/auth/magic-link
 * @desc    Request magic link for email
 * @access  Public
 */
router.post(
  "/magic-link",
  rateLimiter.magicLink,
  [
    body("email")
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email address"),
  ],
  validateRequest,
  authController.requestMagicLink
);

/**
 * @route   GET /api/auth/verify-magic
 * @desc    Verify magic link token
 * @access  Public
 */
router.get("/verify-magic", authController.verifyMagicLink);

module.exports = router;
