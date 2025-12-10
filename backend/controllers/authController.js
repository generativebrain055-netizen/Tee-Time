const twilio = require("twilio");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");
const otpRepository = require("../repositories/otpRepository");
const logger = require("../config/logger");

// Initialize Twilio client
let twilioClient = null;
let verifyService = null;

const initializeTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken) {
    logger.warn(
      "Twilio credentials not configured. OTP will be logged to console."
    );
    return { client: null, verify: null };
  }

  if (!accountSid.startsWith("AC")) {
    logger.error("Invalid TWILIO_ACCOUNT_SID. Must start with AC");
    return { client: null, verify: null };
  }

  try {
    const client = twilio(accountSid, authToken);

    // Initialize Verify service if SID is provided
    const verify = verifyServiceSid
      ? client.verify.v2.services(verifyServiceSid)
      : null;

    if (!verify) {
      logger.warn(
        "TWILIO_VERIFY_SERVICE_SID not configured. Using fallback OTP method."
      );
    }

    return { client, verify };
  } catch (error) {
    logger.error("Failed to initialize Twilio client:", error);
    return { client: null, verify: null };
  }
};

const twilioInit = initializeTwilioClient();
twilioClient = twilioInit.client;
verifyService = twilioInit.verify;

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via Twilio Verify API or fallback to SMS
 */
const sendOTPViaTwilio = async (phoneNumber) => {
  // Method 1: Use Twilio Verify API (Recommended)
  if (verifyService) {
    try {
      const verification = await verifyService.verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

      logger.info(
        `OTP sent via Verify API to ${phoneNumber}. Status: ${verification.status}`
      );
      return {
        success: true,
        mode: "verify_api",
        status: verification.status,
        sid: verification.sid,
      };
    } catch (error) {
      logger.error(`Twilio Verify API error for ${phoneNumber}:`, error);

      // Fallback to manual OTP in development
      if (process.env.NODE_ENV === "development") {
        const otp = generateOTP();
        logger.info(
          `\n🔐 [VERIFY API FAILED - FALLBACK] OTP for ${phoneNumber}: ${otp}\n`
        );
        return { success: true, mode: "console_fallback", otp };
      }

      throw error;
    }
  }

  // Method 2: Manual OTP with Messages API (Fallback)
  if (twilioClient) {
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!fromNumber) {
      throw new Error("TWILIO_FROM_NUMBER not configured");
    }

    const otp = generateOTP();

    try {
      const message = await twilioClient.messages.create({
        body: `Your TeeTime Golf verification code is: ${otp}. Valid for 5 minutes.`,
        from: fromNumber,
        to: phoneNumber,
      });

      logger.info(
        `OTP sent via Messages API to ${phoneNumber}. SID: ${message.sid}`
      );
      return { success: true, mode: "messages_api", sid: message.sid, otp };
    } catch (error) {
      logger.error(`Twilio Messages API error for ${phoneNumber}:`, error);

      // Fallback to console in development
      if (process.env.NODE_ENV === "development") {
        logger.info(
          `\n🔐 [MESSAGES API FAILED - FALLBACK] OTP for ${phoneNumber}: ${otp}\n`
        );
        return { success: true, mode: "console_fallback", otp };
      }

      throw error;
    }
  }

  // Method 3: Development mode - log OTP to console
  const otp = generateOTP();
  logger.info(`\n🔐 [DEVELOPMENT MODE] OTP for ${phoneNumber}: ${otp}\n`);
  return { success: true, mode: "console", otp };
};

/**
 * Verify OTP via Twilio Verify API
 */
const verifyOTPViaTwilio = async (phoneNumber, otp) => {
  if (!verifyService) {
    return null; // Will use manual verification
  }

  try {
    const verificationCheck = await verifyService.verificationChecks.create({
      to: phoneNumber,
      code: otp,
    });

    logger.info(
      `OTP verification for ${phoneNumber}. Status: ${verificationCheck.status}`
    );
    return verificationCheck.status === "approved";
  } catch (error) {
    logger.error(`Twilio Verify check error for ${phoneNumber}:`, error);
    return null; // Will fallback to manual verification
  }
};

/**
 * Request OTP
 */
const requestOTP = async (req, res, next) => {
  try {
    const { phoneNumber, purpose = "signup" } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Check rate limiting
    const isPhoneRateLimited = await otpRepository.isPhoneRateLimited(
      phoneNumber,
      parseInt(process.env.OTP_RATE_LIMIT_PER_HOUR) || 5
    );

    if (isPhoneRateLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests. Please try again later.",
      });
    }

    // Check if user already exists
    const existingUser = await userRepository.findByPhoneNumber(phoneNumber);

    // For LOGIN purpose: user must exist
    if (purpose === "login") {
      if (!existingUser) {
        return res.status(400).json({
          success: false,
          message:
            "No account found with this phone number. Please sign up first.",
        });
      }
    } else {
      // For SIGNUP purpose: user should not have a password already
      if (existingUser && existingUser.password_hash) {
        return res.status(400).json({
          success: false,
          message: "Account already exists. Please login instead.",
        });
      }
    }

    // Send OTP via Twilio
    const sendResult = await sendOTPViaTwilio(phoneNumber);

    // If using Verify API, we don't need to store OTP hash
    // If using manual method, store the OTP hash
    if (sendResult.otp) {
      const otpHash = await bcrypt.hash(sendResult.otp, 10);
      const expiresAt = new Date(
        Date.now() + (parseInt(process.env.OTP_TTL_MS) || 300000)
      );

      await otpRepository.create({
        phoneNumber,
        userId: existingUser?.id || null,
        otpCodeHash: otpHash,
        purpose: purpose, // Use the purpose from request (login or signup)
        expiresAt,
        ipAddress,
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 5,
      });
    }

    const isDevelopmentMode =
      sendResult.mode === "console" || sendResult.mode === "console_fallback";

    return res.json({
      success: true,
      message: isDevelopmentMode
        ? "OTP generated. Check server console for code."
        : "OTP sent successfully to your phone.",
      mode: sendResult.mode,
      expiresInSeconds: parseInt(process.env.OTP_TTL_MS) / 1000 || 300,
      resendAfterSeconds: parseInt(process.env.OTP_RESEND_SECONDS) || 30,
    });
  } catch (error) {
    logger.error("Error in requestOTP:", error);
    next(error);
  }
};

/**
 * Helper function to create account after OTP verification
 * Supports passwordless signup - password is optional
 */
const createAccountAfterOTP = async (
  req,
  res,
  next,
  phoneNumber,
  firstName,
  lastName,
  username,
  handicap,
  password
) => {
  try {
    const cryptoUtils = require("../utils/crypto");
    const sessionRepository = require("../repositories/sessionRepository");
    const deviceFingerprint = require("../utils/deviceFingerprint");

    // Password is optional for passwordless signup
    let passwordHash = null;
    if (password && password.length >= 6) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Check if user exists
    let user = await userRepository.findByPhoneNumber(phoneNumber);

    if (user) {
      // Update existing user with new info
      user = await userRepository.update(user.id, {
        firstName: firstName || user.first_name,
        lastName: lastName || user.last_name,
        username: username || user.username,
        handicap: handicap || user.handicap,
        passwordHash: passwordHash || user.password_hash,
        isVerified: true,
      });
    } else {
      // Create new user (passwordless)
      user = await userRepository.create({
        phoneNumber,
        firstName,
        lastName,
        username,
        handicap,
        passwordHash, // Can be null for passwordless
        isVerified: true,
      });
    }

    // Extract and save device info
    const deviceInfo =
      req.deviceInfo || deviceFingerprint.extractDeviceInfo(req);
    const device = await deviceFingerprint.saveDevice(user.id, deviceInfo);

    // Generate JWT tokens
    const tokenFamilyId = cryptoUtils.generateSessionId();
    const accessToken = cryptoUtils.generateAccessToken(
      { userId: user.id },
      process.env.JWT_ACCESS_EXPIRY || "15m"
    );
    const refreshToken = cryptoUtils.generateRefreshToken(
      { userId: user.id, tokenFamilyId },
      process.env.JWT_REFRESH_EXPIRY || "7d"
    );

    // Create session
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sessionRepository.create({
      userId: user.id,
      deviceId: device?.id || null,
      accessTokenHash: cryptoUtils.hashToken(accessToken),
      refreshTokenHash: cryptoUtils.hashToken(refreshToken),
      tokenFamilyId,
      ipAddress,
      userAgent,
      expiresAt,
      rememberMe: false,
    });

    return res.json({
      success: true,
      message: "Account created successfully.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
        socialRate: user.social_rate,
      },
    });
  } catch (error) {
    logger.error("Error creating account after OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create account. Please try again.",
    });
  }
};

/**
 * Login user after OTP verification (for existing users)
 */
const loginUserAfterOTP = async (req, res, next, phoneNumber) => {
  try {
    const cryptoUtils = require("../utils/crypto");
    const sessionRepository = require("../repositories/sessionRepository");
    const deviceFingerprint = require("../utils/deviceFingerprint");

    // Find user by phone number
    const user = await userRepository.findByPhoneNumber(phoneNumber);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found. Please sign up first.",
      });
    }

    // Extract and save device info
    const deviceInfo =
      req.deviceInfo || deviceFingerprint.extractDeviceInfo(req);
    const device = await deviceFingerprint.saveDevice(user.id, deviceInfo);

    // Generate JWT tokens
    const tokenFamilyId = cryptoUtils.generateSessionId();
    const accessToken = cryptoUtils.generateAccessToken(
      { userId: user.id },
      process.env.JWT_ACCESS_EXPIRY || "15m"
    );
    const refreshToken = cryptoUtils.generateRefreshToken(
      { userId: user.id, tokenFamilyId },
      process.env.JWT_REFRESH_EXPIRY || "7d"
    );

    // Create session
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sessionRepository.create({
      userId: user.id,
      deviceId: device?.id || null,
      accessTokenHash: cryptoUtils.hashToken(accessToken),
      refreshTokenHash: cryptoUtils.hashToken(refreshToken),
      tokenFamilyId,
      ipAddress,
      userAgent,
      expiresAt,
      rememberMe: false,
    });

    // Update last login
    await userRepository.updateLastLogin(user.id, ipAddress);

    logger.info("✅ [BACKEND] User logged in via OTP:", {
      userId: user.id,
      phoneNumber,
    });

    return res.json({
      success: true,
      message: "Login successful!",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
        socialRate: user.social_rate,
      },
    });
  } catch (error) {
    logger.error("Error logging in user after OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to login. Please try again.",
    });
  }
};

/**
 * Verify OTP
 */
const verifyOTP = async (req, res, next) => {
  try {
    const {
      phoneNumber,
      otp,
      purpose = "signup", // 'login' or 'signup'
      firstName,
      lastName,
      username,
      handicap,
      password,
    } = req.body;

    logger.info("🔍 [BACKEND] Verifying OTP:", {
      phoneNumber,
      otp,
      otpLength: otp?.length,
      otpType: typeof otp,
      purpose,
      hasPassword: !!password,
      hasUserData: !!(firstName || lastName || username),
    });

    // Try Twilio Verify API first
    const twilioVerified = await verifyOTPViaTwilio(phoneNumber, otp);
    logger.info("🔍 [BACKEND] Twilio Verify result:", twilioVerified);

    if (twilioVerified === true) {
      // For LOGIN purpose, just login the user
      if (purpose === "login") {
        return await loginUserAfterOTP(req, res, next, phoneNumber);
      }

      // For SIGNUP purpose: Create account (passwordless)
      return await createAccountAfterOTP(
        req,
        res,
        next,
        phoneNumber,
        firstName,
        lastName,
        username,
        handicap,
        password || null // Password is optional for passwordless signup
      );
    }

    // Fallback to manual verification (if Verify API not available or failed)
    logger.info("🔍 [BACKEND] Falling back to manual verification");
    const otpRecord = await otpRepository.findLatestValid(
      phoneNumber,
      purpose // Use the purpose from request
    );

    logger.info("🔍 [BACKEND] OTP record found:", {
      found: !!otpRecord,
      id: otpRecord?.id,
      attempts: otpRecord?.attempts,
      maxAttempts: otpRecord?.max_attempts,
      expiresAt: otpRecord?.expires_at,
    });

    if (!otpRecord) {
      logger.error("❌ [BACKEND] No OTP record found in database");
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please request a new one.",
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    logger.info("🔍 [BACKEND] Comparing OTP with hash", {
      receivedOtp: otp,
      receivedOtpLength: otp?.length,
      receivedOtpType: typeof otp,
      otpRecordId: otpRecord.id,
      hasHash: !!otpRecord.otp_code_hash,
    });
    const isValid = await bcrypt.compare(otp, otpRecord.otp_code_hash);
    logger.info("🔍 [BACKEND] OTP comparison result:", isValid);

    if (!isValid) {
      logger.error("❌ [BACKEND] Invalid OTP entered");
      await otpRepository.incrementAttempts(otpRecord.id);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
        attemptsRemaining: otpRecord.max_attempts - otpRecord.attempts - 1,
      });
    }

    logger.info("✅ [BACKEND] OTP verified successfully");

    // Mark OTP as verified
    await otpRepository.markAsVerified(otpRecord.id);

    // For LOGIN purpose, just login the user
    if (purpose === "login") {
      return await loginUserAfterOTP(req, res, next, phoneNumber);
    }

    // For SIGNUP: Create account without password (passwordless)
    return await createAccountAfterOTP(
      req,
      res,
      next,
      phoneNumber,
      firstName,
      lastName,
      username,
      handicap,
      null // No password required - passwordless signup
    );
  } catch (error) {
    logger.error("Error in verifyOTP:", error);
    next(error);
  }
};

/**
 * Set Password (after OTP verification)
 */
const setPassword = async (req, res, next) => {
  try {
    const {
      phoneNumber,
      password,
      otpSessionToken,
      firstName,
      lastName,
      username,
      handicap,
    } = req.body;
    const cryptoUtils = require("../utils/crypto");
    const sessionRepository = require("../repositories/sessionRepository");
    const deviceFingerprint = require("../utils/deviceFingerprint");

    // Validate password
    const validation = require("../utils/validation");
    const passwordValidation = validation.validatePassword(password);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.errors[0],
        errors: passwordValidation.errors,
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create or update user
    let user = await userRepository.findByPhoneNumber(phoneNumber);

    if (user) {
      user = await userRepository.updatePassword(user.id, passwordHash);
    } else {
      user = await userRepository.create({
        phoneNumber,
        firstName,
        lastName,
        username,
        handicap,
        passwordHash,
        isVerified: true,
      });
    }

    // Extract and save device info
    const deviceInfo =
      req.deviceInfo || deviceFingerprint.extractDeviceInfo(req);
    const device = await deviceFingerprint.saveDevice(user.id, deviceInfo);

    // Generate JWT tokens and create session
    const tokenFamilyId = cryptoUtils.generateSessionId();
    const accessToken = cryptoUtils.generateAccessToken(
      { userId: user.id },
      process.env.JWT_ACCESS_EXPIRY || "15m"
    );
    const refreshToken = cryptoUtils.generateRefreshToken(
      { userId: user.id, tokenFamilyId },
      process.env.JWT_REFRESH_EXPIRY || "7d"
    );

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sessionRepository.create({
      userId: user.id,
      deviceId: device?.id || null,
      accessTokenHash: cryptoUtils.hashToken(accessToken),
      refreshTokenHash: cryptoUtils.hashToken(refreshToken),
      tokenFamilyId,
      ipAddress,
      userAgent,
      expiresAt,
      rememberMe: false,
    });

    return res.json({
      success: true,
      message: "Account created successfully.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
      },
    });
  } catch (error) {
    logger.error("Error in setPassword:", error);
    next(error);
  }
};

/**
 * Login with phone and password
 */
const login = async (req, res, next) => {
  try {
    const { phoneNumber, username, password, rememberMe } = req.body;
    const cryptoUtils = require("../utils/crypto");
    const sessionRepository = require("../repositories/sessionRepository");
    const deviceFingerprint = require("../utils/deviceFingerprint");

    // Find user by phone or username
    let user;
    if (username) {
      user = await userRepository.findByUsername(username);
    } else if (phoneNumber) {
      user = await userRepository.findByPhoneNumber(phoneNumber);
    } else {
      return res.status(400).json({
        success: false,
        message: "Phone number or username is required.",
      });
    }

    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // Check if account is locked
    if (user.is_locked && new Date(user.locked_until) > new Date()) {
      const lockDuration = Math.ceil(
        (new Date(user.locked_until) - new Date()) / 1000 / 60
      );
      return res.status(401).json({
        success: false,
        message: `Account is locked. Try again in ${lockDuration} minutes.`,
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts
      await userRepository.incrementFailedLoginAttempts(user.id);

      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // Reset failed login attempts
    await userRepository.resetFailedLoginAttempts(user.id);

    // Extract and save device info
    const deviceInfo =
      req.deviceInfo || deviceFingerprint.extractDeviceInfo(req);
    const device = await deviceFingerprint.saveDevice(user.id, deviceInfo);

    // Generate JWT tokens
    const tokenFamilyId = cryptoUtils.generateSessionId();
    const accessToken = cryptoUtils.generateAccessToken(
      { userId: user.id },
      process.env.JWT_ACCESS_EXPIRY || "15m"
    );
    const refreshToken = cryptoUtils.generateRefreshToken(
      { userId: user.id, tokenFamilyId },
      process.env.JWT_REFRESH_EXPIRY || "7d"
    );

    // Create session in database
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const expiresAt = new Date(
      Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000
    );

    const session = await sessionRepository.create({
      userId: user.id,
      deviceId: device?.id || null,
      accessTokenHash: cryptoUtils.hashToken(accessToken),
      refreshTokenHash: cryptoUtils.hashToken(refreshToken),
      tokenFamilyId,
      ipAddress,
      userAgent,
      expiresAt,
      rememberMe: rememberMe || false,
    });

    // Update last login
    await userRepository.updateLastLogin(user.id, ipAddress, device?.id);

    return res.json({
      success: true,
      message: "Login successful.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
        socialRate: user.social_rate,
      },
    });
  } catch (error) {
    logger.error("Error in login:", error);
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    // Verify refresh token
    const cryptoUtils = require("../utils/crypto");
    let decoded;
    try {
      decoded = cryptoUtils.verifyRefreshToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token.",
      });
    }

    // Find session by refresh token hash
    const sessionRepository = require("../repositories/sessionRepository");
    const tokenHash = cryptoUtils.hashToken(token);
    const session = await sessionRepository.findByRefreshToken(tokenHash);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session not found or expired.",
      });
    }

    // Generate new tokens
    const newAccessToken = cryptoUtils.generateAccessToken(
      { userId: session.user_id, sessionId: session.id },
      process.env.JWT_ACCESS_EXPIRY || "15m"
    );

    const newRefreshToken = cryptoUtils.generateRefreshToken(
      {
        userId: session.user_id,
        sessionId: session.id,
        tokenFamilyId: session.token_family_id,
      },
      process.env.JWT_REFRESH_EXPIRY || "7d"
    );

    // Update session with new token hashes
    const newAccessTokenHash = cryptoUtils.hashToken(newAccessToken);
    const newRefreshTokenHash = cryptoUtils.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await sessionRepository.updateTokens(
      session.id,
      newAccessTokenHash,
      newRefreshTokenHash,
      expiresAt
    );

    return res.json({
      success: true,
      message: "Token refreshed successfully.",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Error in refreshToken:", error);
    next(error);
  }
};

/**
 * Logout current session
 */
const logout = async (req, res, next) => {
  try {
    const sessionRepository = require("../repositories/sessionRepository");

    if (req.session?.id) {
      await sessionRepository.revoke(
        req.session.id,
        req.user.id,
        "user_logout"
      );
    }

    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    logger.error("Error in logout:", error);
    next(error);
  }
};

/**
 * Logout from all devices
 */
const logoutAll = async (req, res, next) => {
  try {
    const sessionRepository = require("../repositories/sessionRepository");

    const revokedCount = await sessionRepository.revokeAllForUser(
      req.user.id,
      req.session?.id, // Keep current session active
      "user_logout_all"
    );

    return res.json({
      success: true,
      message: `Logged out from ${revokedCount} device(s).`,
      revokedSessions: revokedCount,
    });
  } catch (error) {
    logger.error("Error in logoutAll:", error);
    next(error);
  }
};

/**
 * Get current user profile
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isVerified: user.is_verified,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    logger.error("Error in getCurrentUser:", error);
    next(error);
  }
};

/**
 * Request magic link for email authentication
 */
const requestMagicLink = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];

    // Check rate limiting
    const magicLinkRepository = require("../repositories/magicLinkRepository");
    const isRateLimited = await magicLinkRepository.isEmailRateLimited(
      email,
      3
    );

    if (isRateLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many magic link requests. Please try again later.",
      });
    }

    // Find or prepare user
    let user = await userRepository.findByEmail(email);
    const purpose = user ? "login" : "signup";

    // Generate magic link token
    const cryptoUtils = require("../utils/crypto");
    const token = cryptoUtils.generateToken(32);
    const tokenHash = cryptoUtils.hashToken(token);

    // Calculate expiry
    const expiryMinutes = parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES) || 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save magic link to database
    await magicLinkRepository.create({
      userId: user?.id || null,
      email,
      tokenHash,
      purpose,
      expiresAt,
      ipAddress,
      userAgent,
      maxAttempts: 3,
    });

    // Send email via SendGrid
    const sgMail = require("@sendgrid/mail");
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      logger.warn(
        "SendGrid API key not configured. Magic link logged to console."
      );
      const magicLink = `${process.env.API_URL}/auth/verify-magic?token=${token}`;
      logger.info(`\n🔗 [MAGIC LINK] for ${email}:\n${magicLink}\n`);

      return res.json({
        success: true,
        message: "Magic link generated. Check server console.",
        mode: "console",
      });
    }

    sgMail.setApiKey(apiKey);

    // Create both web and deep link URLs
    const webLink = `${process.env.API_URL}/auth/verify-magic?token=${token}`;
    const deepLink = `teetimegolf://auth/magic-link?token=${token}`;
    const universalLink = `${process.env.API_URL}/auth/magic-link-redirect?token=${token}`;

    const fromEmail =
      process.env.SENDGRID_FROM_EMAIL || "noreply@teetimeapp.com";
    const fromName = process.env.SENDGRID_FROM_NAME || "TeeTime Golf App";

    const msg = {
      to: email,
      from: { email: fromEmail, name: fromName },
      subject:
        purpose === "login"
          ? "Your TeeTime Login Link"
          : "Welcome to TeeTime Golf",
      text: `Click this link to ${
        purpose === "login" ? "log in" : "sign up"
      }: ${universalLink}\n\nThis link expires in ${expiryMinutes} minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">${
            purpose === "login"
              ? "Log in to TeeTime Golf"
              : "Welcome to TeeTime Golf"
          }</h2>
          <p style="color: #555; font-size: 16px;">Click the button below to ${
            purpose === "login" ? "log in" : "complete your signup"
          }:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${universalLink}" style="display: inline-block; padding: 15px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
              ${purpose === "login" ? "🏌️ Log In to TeeTime" : "🏌️ Get Started"}
            </a>
          </div>
          
          <p style="color: #777; font-size: 14px;">Or copy and paste this link in your browser:</p>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #555;">
            ${universalLink}
          </p>
          
          <div style="margin-top: 30px; padding: 15px; background: #f0f8ff; border-left: 4px solid #4CAF50; border-radius: 5px;">
            <p style="margin: 0; color: #555; font-size: 14px;">
              <strong>📱 Using the mobile app?</strong><br>
              The link will automatically open the TeeTime Golf app on your device.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            <small>⏱️ This link expires in ${expiryMinutes} minutes.</small><br>
            <small>If you didn't request this, you can safely ignore this email.</small>
          </p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      logger.info(`Magic link sent to ${email}`);

      return res.json({
        success: true,
        message: "Magic link sent to your email.",
        expiresInMinutes: expiryMinutes,
      });
    } catch (error) {
      logger.error("SendGrid error:", error);

      // Fallback to console in development
      if (process.env.NODE_ENV === "development") {
        logger.info(
          `\n🔗 [SENDGRID FAILED - FALLBACK] Magic link for ${email}:\n${magicLink}\n`
        );
        return res.json({
          success: true,
          message: "Magic link generated. Check server console.",
          mode: "console_fallback",
        });
      }

      throw error;
    }
  } catch (error) {
    logger.error("Error in requestMagicLink:", error);
    next(error);
  }
};

/**
 * Magic link redirect handler (Universal Link)
 * Detects if mobile app is installed and redirects accordingly
 */
const magicLinkRedirect = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link - TeeTime Golf</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; }
            p { color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Invalid Link</h1>
            <p>This magic link is invalid or has expired.</p>
            <p>Please request a new one from the app.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Try to open the app with deep link, fallback to web verification
    const deepLink = `teetimegolf://auth/magic-link?token=${token}`;
    const webFallback = `${process.env.API_URL}/auth/verify-magic?token=${token}`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Opening TeeTime Golf...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 15px;
            max-width: 500px;
            margin: 0 auto;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            color: #333;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4CAF50;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
            font-weight: bold;
          }
          .button:hover {
            background: #45a049;
          }
          .info {
            margin-top: 30px;
            padding: 15px;
            background: #f0f8ff;
            border-radius: 5px;
            font-size: 14px;
            color: #555;
          }
        </style>
        <script>
          // Attempt to open the app
          window.location.href = '${deepLink}';
          
          // Fallback to web after 2 seconds if app doesn't open
          setTimeout(function() {
            document.getElementById('status').innerHTML = 
              '<p>App not installed? <a href="${webFallback}" class="button">Continue in Browser</a></p>';
          }, 2000);
          
          // For iOS, try universal link approach
          if (/(iPhone|iPad|iPod)/i.test(navigator.userAgent)) {
            setTimeout(function() {
              if (document.hidden || document.webkitHidden) {
                // App opened successfully
                return;
              }
              // App not installed, show web option
              document.getElementById('status').innerHTML = 
                '<p>📱 Install the TeeTime Golf app for the best experience!</p>' +
                '<a href="${webFallback}" class="button">Continue in Browser</a>';
            }, 1500);
          }
        </script>
      </head>
      <body>
        <div class="container">
          <h1>🏌️ TeeTime Golf</h1>
          <div class="spinner"></div>
          <div id="status">
            <p>Opening the app...</p>
            <p style="font-size: 14px; color: #777;">Please wait a moment</p>
          </div>
          <div class="info">
            <strong>💡 Tip:</strong> If the app doesn't open automatically, 
            make sure you have the TeeTime Golf app installed on your device.
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error("Error in magicLinkRedirect:", error);
    next(error);
  }
};

/**
 * Verify magic link token (API endpoint for app)
 */
const verifyMagicLink = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Magic link token is required.",
      });
    }

    // Hash token and find in database
    const cryptoUtils = require("../utils/crypto");
    const tokenHash = cryptoUtils.hashToken(token);

    const magicLinkRepository = require("../repositories/magicLinkRepository");
    const magicLink = await magicLinkRepository.findByTokenHash(tokenHash);

    if (!magicLink) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired magic link.",
      });
    }

    // Check max attempts
    if (magicLink.attempts >= magicLink.max_attempts) {
      return res.status(400).json({
        success: false,
        message: "Magic link has been used too many times.",
      });
    }

    // Mark as used
    await magicLinkRepository.markAsUsed(magicLink.id);

    // Find or create user
    let user = magicLink.user_id
      ? await userRepository.findById(magicLink.user_id)
      : await userRepository.findByEmail(magicLink.email);

    if (!user) {
      // Create new user
      user = await userRepository.create({
        email: magicLink.email,
        isVerified: true,
      });
    }

    // Generate session tokens
    const sessionRepository = require("../repositories/sessionRepository");
    const tokenFamilyId = cryptoUtils.generateSessionId();

    const accessToken = cryptoUtils.generateAccessToken(
      { userId: user.id },
      process.env.JWT_ACCESS_EXPIRY || "15m"
    );

    const refreshToken = cryptoUtils.generateRefreshToken(
      { userId: user.id, tokenFamilyId },
      process.env.JWT_REFRESH_EXPIRY || "7d"
    );

    // Create session
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sessionRepository.create({
      userId: user.id,
      accessTokenHash: cryptoUtils.hashToken(accessToken),
      refreshTokenHash: cryptoUtils.hashToken(refreshToken),
      tokenFamilyId,
      ipAddress,
      userAgent,
      expiresAt,
      rememberMe: true,
    });

    return res.json({
      success: true,
      message: "Magic link verified successfully.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phone_number,
      },
    });
  } catch (error) {
    logger.error("Error in verifyMagicLink:", error);
    next(error);
  }
};

/**
 * Request magic link via SMS for signup
 * Sends magic link to phone number via Twilio SMS
 */
const requestSmsMagicLink = async (req, res, next) => {
  try {
    const { phoneNumber, userData } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    // Check rate limiting
    const magicLinkRepository = require("../repositories/magicLinkRepository");
    const isRateLimited = await magicLinkRepository.isPhoneRateLimited(
      phoneNumber,
      3
    );

    if (isRateLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many magic link requests. Please try again later.",
      });
    }

    // Check if user already exists with this phone
    let user = await userRepository.findByPhoneNumber(phoneNumber);

    if (user) {
      return res.status(400).json({
        success: false,
        message:
          "An account with this phone number already exists. Please login instead.",
      });
    }

    // Generate magic link token
    const cryptoUtils = require("../utils/crypto");
    const token = cryptoUtils.generateToken(32);
    const tokenHash = cryptoUtils.hashToken(token);

    // Calculate expiry
    const expiryMinutes = parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES) || 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store user data with the magic link for later account creation
    // userData is stored in metadata field as JSON
    await magicLinkRepository.create({
      userId: null,
      email: userData?.email || null,
      phoneNumber,
      tokenHash,
      purpose: "signup",
      expiresAt,
      ipAddress,
      userAgent,
      maxAttempts: 3,
      metadata: userData || null, // Store user data for account creation
    });

    // Create deep link URL
    const deepLink = `teetimegolf://auth/signup-complete?token=${token}`;
    const webLink = `${
      process.env.API_URL || "http://localhost:3000"
    }/auth/verify-signup?token=${token}`;

    // Send SMS via Twilio
    if (twilioClient) {
      const fromNumber = process.env.TWILIO_FROM_NUMBER;

      if (fromNumber) {
        try {
          await twilioClient.messages.create({
            body: `Welcome to TeeTime Golf! 🏌️ Complete your signup: ${webLink}\n\nThis link expires in ${expiryMinutes} minutes.`,
            from: fromNumber,
            to: phoneNumber,
          });

          logger.info(`SMS magic link sent to ${phoneNumber}`);

          return res.json({
            success: true,
            message: "Magic link sent to your phone via SMS.",
            expiresInMinutes: expiryMinutes,
            mode: "sms",
          });
        } catch (twilioError) {
          logger.error("Twilio SMS error:", twilioError);
          // Fall through to console logging
        }
      }
    }

    // Fallback: Log to console in development
    logger.info(`\n🔗 [SMS MAGIC LINK] for ${phoneNumber}:`);
    logger.info(`   Deep Link: ${deepLink}`);
    logger.info(`   Web Link: ${webLink}`);
    logger.info(`   Token: ${token}`);
    logger.info(`   Expires in: ${expiryMinutes} minutes\n`);

    return res.json({
      success: true,
      message: "Magic link generated. Check server console.",
      expiresInMinutes: expiryMinutes,
      mode: "console",
      // Include token in dev for testing
      ...(process.env.NODE_ENV === "development" && { devToken: token }),
    });
  } catch (error) {
    logger.error("Error in requestSmsMagicLink:", error);
    next(error);
  }
};

/**
 * Verify SMS magic link and complete signup
 * Creates the user account when magic link is verified
 */
const verifySmsMagicLink = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required.",
      });
    }

    const cryptoUtils = require("../utils/crypto");
    const magicLinkRepository = require("../repositories/magicLinkRepository");
    const sessionRepository = require("../repositories/sessionRepository");
    const deviceFingerprint = require("../utils/deviceFingerprint");

    // Hash the token to find in database
    const tokenHash = cryptoUtils.hashToken(token);
    const magicLink = await magicLinkRepository.findByTokenHash(tokenHash);

    if (!magicLink) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired magic link.",
      });
    }

    // Check if max attempts reached
    if (magicLink.attempts >= magicLink.max_attempts) {
      return res.status(400).json({
        success: false,
        message: "Magic link has exceeded maximum attempts.",
      });
    }

    // Increment attempts
    await magicLinkRepository.incrementAttempts(magicLink.id);

    // Mark as used
    await magicLinkRepository.markAsUsed(magicLink.id);

    // Get user data from metadata stored when magic link was created
    const storedUserData = magicLink.metadata || {};

    // Create the user account using stored metadata
    const user = await userRepository.create({
      phoneNumber: magicLink.phone_number,
      email: storedUserData.email || magicLink.email,
      firstName: storedUserData.firstName || null,
      lastName: storedUserData.lastName || null,
      username: storedUserData.username || null,
      handicap: storedUserData.handicap || null,
      passwordHash: null, // Passwordless signup
      isVerified: true,
    });

    // Extract and save device info
    const deviceInfo =
      req.deviceInfo || deviceFingerprint.extractDeviceInfo(req);
    const device = await deviceFingerprint.saveDevice(user.id, deviceInfo);

    // Generate JWT tokens
    const tokenFamilyId = cryptoUtils.generateSessionId();
    const accessToken = cryptoUtils.generateAccessToken(
      { userId: user.id },
      process.env.JWT_ACCESS_EXPIRY || "15m"
    );
    const refreshToken = cryptoUtils.generateRefreshToken(
      { userId: user.id, tokenFamilyId },
      process.env.JWT_REFRESH_EXPIRY || "7d"
    );

    // Create session
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sessionRepository.create({
      userId: user.id,
      deviceId: device?.id || null,
      accessTokenHash: cryptoUtils.hashToken(accessToken),
      refreshTokenHash: cryptoUtils.hashToken(refreshToken),
      tokenFamilyId,
      ipAddress,
      userAgent,
      expiresAt,
      rememberMe: true,
    });

    logger.info(`New user created via SMS magic link: ${user.id}`);

    return res.json({
      success: true,
      message: "Account created successfully.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
        socialRate: user.social_rate,
      },
    });
  } catch (error) {
    logger.error("Error in verifySmsMagicLink:", error);
    next(error);
  }
};

/**
 * Direct user registration (passwordless, no OTP required)
 * Used for onboarding flow where phone is verified via magic link mock
 */
const registerUser = async (req, res, next) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      username,
      email,
      handicap,
    } = req.body;

    logger.info("📝 [BACKEND] Direct user registration:", {
      phoneNumber,
      firstName,
      lastName,
      username,
      email,
      handicap,
    });

    // Check if user already exists with this phone number
    const existingUser = await userRepository.findByPhoneNumber(phoneNumber);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this phone number already exists. Please login instead.",
      });
    }

    // Check if username is taken (if provided)
    if (username) {
      const existingUsername = await userRepository.findByUsername(username);
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "This username is already taken. Please choose another.",
        });
      }
    }

    // Create new user (passwordless)
    const user = await userRepository.create({
      phoneNumber,
      firstName,
      lastName,
      username: username || `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`,
      email: email || null,
      handicap: handicap ? parseInt(handicap) : null,
      passwordHash: null, // Passwordless signup
      isVerified: true,
    });

    logger.info("✅ [BACKEND] User registered successfully:", {
      userId: user.id,
      phoneNumber,
      username: user.username,
    });

    return res.json({
      success: true,
      message: "Account created successfully. Please login to continue.",
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
        socialRate: user.social_rate,
      },
    });
  } catch (error) {
    logger.error("Error in registerUser:", error);
    next(error);
  }
};

module.exports = {
  requestOTP,
  verifyOTP,
  setPassword,
  login,
  refreshToken,
  logout,
  logoutAll,
  getCurrentUser,
  requestMagicLink,
  magicLinkRedirect,
  verifyMagicLink,
  requestSmsMagicLink,
  verifySmsMagicLink,
  registerUser,
};
