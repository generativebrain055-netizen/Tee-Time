/**
 * Auth routes.
 * Phone number verification for sign-up/sign-in is performed via magic link (SMS link),
 * not OTP/code. Use POST /auth/sms-magic-link, /auth/sms-magic-link-login, and
 * GET /auth/verify-sms-magic-link for phone verification.
 */
const { Router } = require("express");
const { body } = require("express-validator");
// Use modular auth controllers (backward compatible)
const authController = require("../controllers/auth");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");
const rateLimiter = require("../middleware/rateLimiter");
const { logAuthEvent } = require("../middleware/analytics");
const { captureDeviceInfo } = require("../utils/deviceFingerprint");

const router = Router();

/**
 * @route   POST /auth/register-username
 * @desc    Register with username and password (no phone required)
 * @access  Public
 */
router.post(
  "/register-username",
  captureDeviceInfo,
  rateLimiter.login,
  [
    body("username")
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Username must be between 3 and 50 characters"),
    body("password").trim().notEmpty().withMessage("Password is required"),
    body("firstName").optional().trim().isLength({ max: 50 }),
    body("lastName").optional().trim().isLength({ max: 50 }),
    body("email").optional().trim().isEmail().normalizeEmail(),
  ],
  validateRequest,
  logAuthEvent("user_registered"),
  authController.registerWithUsername,
);

/**
 * @route   POST /api/auth/request-otp
 * @desc    Request OTP for phone number (not used for sign-up/sign-in; app uses magic link)
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
        "Invalid phone number format. Must be E.164 format (+1234567890)",
      ),
  ],
  validateRequest,
  logAuthEvent("otp_requested"),
  authController.requestOTP,
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and create session (not used for sign-up/sign-in; app uses magic link)
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
  authController.verifyOTP,
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
  authController.setPassword,
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
  (req, res, next) => {
    const hasUsername = req.body.username && req.body.username.trim().length >= 3;
    const hasPhone = req.body.phoneNumber && /^\+[1-9]\d{1,14}$/.test(String(req.body.phoneNumber).trim());
    if (!hasUsername && !hasPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number or username is required.",
      });
    }
    next();
  },
  validateRequest,
  logAuthEvent("login"),
  authController.login,
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
  authController.refreshToken,
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
  authController.logout,
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
/**
 * @route   DELETE /api/auth/account
 * @desc    Soft-delete current user and revoke all sessions
 * @access  Private
 */
router.delete("/account", authenticate, authController.deleteAccount);

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
  authController.updateProfile,
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
  authController.requestMagicLink,
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
  authController.verifyMagicLink,
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
  authController.requestSmsMagicLink,
);

/**
 * @route   POST /api/auth/sms-magic-link-login
 * @desc    Request magic link via SMS for sign-in (existing users only)
 * @access  Public
 */
router.post(
  "/sms-magic-link-login",
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
  logAuthEvent("sms_magic_link_login_requested"),
  authController.requestSmsMagicLinkForLogin,
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
  authController.verifySmsMagicLink,
);

/**
 * @route   POST /api/auth/upload-avatar
 * @desc    Upload profile photo, returns public URL. If authenticated, also saves to user profile.
 * @access  Public (register) or Private (authenticated – persists to profile)
 */
router.post(
  "/upload-avatar",
  captureDeviceInfo,
  optionalAuth,
  [
    body("imageBase64").optional().isString(),
    body("profilePhotoBase64").optional().isString(),
  ],
  (req, res, next) => {
    if (!req.body.imageBase64 && !req.body.profilePhotoBase64) {
      return res.status(400).json({
        success: false,
        message: "Image data is required (imageBase64 or profilePhotoBase64).",
      });
    }
    next();
  },
  authController.uploadAvatar,
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
      .withMessage(
        "Invalid phone number format. Must be E.164 format (+1234567890)",
      ),
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
    body("zipCode")
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 20 })
      .withMessage("Zip code must be at most 20 characters"),
  ],
  validateRequest,
  logAuthEvent("user_registered"),
  authController.registerUser,
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth Callback (Custom Redirect Handler)
 * @access  Public
 * @note    Receives OAuth callback, exchanges code, and redirects to app with token
 */
router.get("/google/callback", authController.googleOAuthCallback);

/**
 * @route   POST /api/auth/google
 * @desc    Google Sign In
 * @access  Public
 */
router.post(
  "/google",
  captureDeviceInfo,
  [body("idToken").trim().notEmpty().withMessage("ID token is required")],
  validateRequest,
  logAuthEvent("google_signin"),
  authController.googleSignIn,
);

/**
 * @route   POST /api/auth/google/code
 * @desc    Google Sign In with Authorization Code (PKCE Flow)
 * @access  Public
 * @note    Used for Expo Go with auth proxy - exchanges code for tokens
 */
router.post(
  "/google/code",
  captureDeviceInfo,
  [
    body("code").trim().notEmpty().withMessage("Authorization code is required"),
    body("redirectUri").trim().notEmpty().withMessage("Redirect URI is required"),
    body("codeVerifier").optional().trim(),
  ],
  validateRequest,
  logAuthEvent("google_signin_code"),
  authController.googleSignInWithCode,
);

/**
 * @route   POST /api/auth/google/token
 * @desc    Google Sign In with Access Token (Implicit Grant Flow)
 * @access  Public
 * @note    Used for Expo Go development where auth code exchange has redirect issues
 */
router.post(
  "/google/token",
  captureDeviceInfo,
  [
    body("accessToken")
      .trim()
      .notEmpty()
      .withMessage("Access token is required"),
  ],
  validateRequest,
  logAuthEvent("google_signin_token"),
  authController.googleSignInWithAccessToken,
);

/**
 * @route   POST /api/auth/apple
 * @desc    Apple Sign In
 * @access  Public
 */
router.post(
  "/apple",
  captureDeviceInfo,
  [
    body("identityToken")
      .trim()
      .notEmpty()
      .withMessage("Identity token is required"),
  ],
  validateRequest,
  logAuthEvent("apple_signin"),
  authController.appleSignIn,
);

/**
 * @route   POST /api/auth/verify-temp-token
 * @desc    Verify temporary OAuth token from callback
 * @access  Public
 */
router.post(
  "/verify-temp-token",
  [body("token").trim().notEmpty().withMessage("Token is required")],
  validateRequest,
  authController.verifyTempTokenEndpoint,
);

/**
 * @route   POST /api/auth/complete-profile
 * @desc    Complete OAuth profile with additional information (or update profile)
 * @access  Public (with tempToken) or Private (authenticated)
 *
 * NOTE: Phone number is OPTIONAL for OAuth users.
 * The tempToken flow is DEPRECATED - new apps should use authenticated profile updates.
 */
router.post(
  "/complete-profile",
  captureDeviceInfo,
  optionalAuth, // Allow both authenticated and unauthenticated requests
  [
    // tempToken is optional - supports both legacy and new flow
    body("tempToken").optional().trim(),
    body("email")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    // Phone is now OPTIONAL for OAuth users
    body("phoneNumber")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage("Invalid phone number format"),
    body("firstName").optional().trim().isLength({ min: 1, max: 50 }),
    body("lastName").optional().trim().isLength({ min: 1, max: 50 }),
    body("username").optional().trim().isLength({ min: 3, max: 50 }),
    body("handicap").optional({ nullable: true }).isInt({ min: 0, max: 54 }),
    // New fields for OAuth onboarding
    body("location").optional().trim().isLength({ max: 255 }),
    body("homeCourse").optional().trim().isLength({ max: 255 }),
  ],
  validateRequest,
  logAuthEvent("oauth_profile_completed"),
  authController.completeOAuthProfile,
);

module.exports = router;
