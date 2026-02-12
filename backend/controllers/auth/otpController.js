const bcrypt = require("bcryptjs");
const userRepository = require("../../repositories/userRepository");
const otpRepository = require("../../repositories/otpRepository");
const teeTimeRepository = require("../../repositories/teeTimeRepository");
const twilioService = require("../../services/twilioService");
const sessionService = require("../../services/sessionService");
const logger = require("../../config/logger");

/**
 * OTP Controller
 * Handles OTP request and verification
 */

/**
 * Request OTP
 */
const requestOTP = async (req, res, next) => {
  try {
    const { phoneNumber, purpose = "signup" } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Check if user already exists
    const existingUser = await userRepository.findByPhoneNumber(phoneNumber);

    // For LOGIN purpose: user must exist
    if (purpose === "login") {
      if (!existingUser) {
        return res.status(400).json({
          success: false,
          message: "No account found with this phone number. Please sign up first.",
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
    const sendResult = await twilioService.sendOTP(phoneNumber);

    // If using manual method, store the OTP hash
    if (sendResult.otp) {
      const otpHash = await bcrypt.hash(sendResult.otp, 10);
      const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_TTL_MS) || 300000));

      // Use phone_number as identifier, not user_id (avoids FK issues)
      await otpRepository.create({
        phoneNumber,
        otpCodeHash: otpHash,
        purpose,
        expiresAt,
        ipAddress,
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 5,
      });
    }

    const isDevelopmentMode = sendResult.mode === "console" || sendResult.mode === "console_fallback";

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
 * Helper: Create account after OTP verification
 */
const createAccountAfterOTP = async (req, res, phoneNumber, firstName, lastName, username, handicap, password) => {
  try {
    let passwordHash = null;
    if (password && password.length >= 6) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    let user = await userRepository.findByPhoneNumber(phoneNumber);

    if (user) {
      user = await userRepository.update(user.id, {
        firstName: firstName || user.first_name,
        lastName: lastName || user.last_name,
        username: username || user.username,
        handicap: handicap || user.handicap,
        passwordHash: passwordHash || user.password_hash,
        isVerified: true,
      });
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

    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
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
        avatarUrl: user.avatar_url || null,
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
 * Helper: Login user after OTP verification
 */
const loginUserAfterOTP = async (req, res, phoneNumber) => {
  try {
    const user = await userRepository.findByPhoneNumber(phoneNumber);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found. Please sign up first.",
      });
    }

    // Mark past tee times as completed
    try {
      const completedTeeTimes = await teeTimeRepository.markPastTeeTimesCompleted();
      if (completedTeeTimes.length > 0) {
        logger.info(`Auto-completed ${completedTeeTimes.length} past tee times on OTP login`);
      }
    } catch (err) {
      logger.error("Error marking past tee times as completed:", err);
    }

    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
      rememberMe: false,
    });

    const ipAddress = req.ip || req.connection.remoteAddress;
    await userRepository.updateLastLogin(user.id, ipAddress);

    logger.info("✅ [BACKEND] User logged in via OTP:", { userId: user.id, phoneNumber });

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
        avatarUrl: user.avatar_url || null,
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
    const { phoneNumber, otp, purpose = "signup", firstName, lastName, username, handicap, password } = req.body;

    logger.info("🔍 [BACKEND] Verifying OTP:", {
      phoneNumber,
      otp,
      otpLength: otp?.length,
      purpose,
      hasPassword: !!password,
    });

    // Try Twilio Verify API first
    const twilioVerified = await twilioService.verifyOTP(phoneNumber, otp);

    if (twilioVerified === true) {
      if (purpose === "login") {
        return await loginUserAfterOTP(req, res, phoneNumber);
      }
      return await createAccountAfterOTP(req, res, phoneNumber, firstName, lastName, username, handicap, password);
    }

    // Fallback to manual verification
    logger.info("🔍 [BACKEND] Falling back to manual verification");
    const otpRecord = await otpRepository.findLatestValid(phoneNumber, purpose);

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please request a new one.",
      });
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp_code_hash);

    if (!isValid) {
      await otpRepository.incrementAttempts(otpRecord.id);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
        attemptsRemaining: otpRecord.max_attempts - otpRecord.attempts - 1,
      });
    }

    logger.info("✅ [BACKEND] OTP verified successfully");
    await otpRepository.markAsVerified(otpRecord.id);

    if (purpose === "login") {
      return await loginUserAfterOTP(req, res, phoneNumber);
    }

    return await createAccountAfterOTP(req, res, phoneNumber, firstName, lastName, username, handicap, null);
  } catch (error) {
    logger.error("Error in verifyOTP:", error);
    next(error);
  }
};

module.exports = {
  requestOTP,
  verifyOTP,
};
