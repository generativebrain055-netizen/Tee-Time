const userRepository = require("../../repositories/userRepository");
const magicLinkRepository = require("../../repositories/magicLinkRepository");
const cryptoUtils = require("../../utils/crypto");
const sessionService = require("../../services/sessionService");
const emailService = require("../../services/emailService");
const twilioService = require("../../services/twilioService");
const logger = require("../../config/logger");

/**
 * Magic Link Controller
 * Handles magic link authentication (email and SMS)
 */

/**
 * Request magic link for email authentication
 */
const requestMagicLink = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];

    // Check rate limiting
    const isRateLimited = await magicLinkRepository.isEmailRateLimited(email, 3);

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

    // Send email
    const result = await emailService.sendMagicLinkEmail({ email, token, purpose });

    return res.json({
      success: true,
      message: result.mode === "console" || result.mode === "console_fallback"
        ? "Magic link generated. Check server console."
        : "Magic link sent to your email.",
      mode: result.mode,
      expiresInMinutes: expiryMinutes,
    });
  } catch (error) {
    logger.error("Error in requestMagicLink:", error);
    next(error);
  }
};

/**
 * Magic link redirect handler (Universal Link)
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

    const deepLink = `teetimegolf://auth/magic-link?token=${token}`;
    const webFallback = `${process.env.API_URL}/auth/verify-magic?token=${token}`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Opening TeeTime Golf...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
          .container { background: rgba(255, 255, 255, 0.95); padding: 40px; border-radius: 15px; max-width: 500px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2); color: #333; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #4CAF50; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .button { display: inline-block; padding: 15px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
          .info { margin-top: 30px; padding: 15px; background: #f0f8ff; border-radius: 5px; font-size: 14px; color: #555; }
        </style>
        <script>
          window.location.href = '${deepLink}';
          setTimeout(function() {
            document.getElementById('status').innerHTML = '<p>App not installed? <a href="${webFallback}" class="button">Continue in Browser</a></p>';
          }, 2000);
        </script>
      </head>
      <body>
        <div class="container">
          <h1>🏌️ TeeTime Golf</h1>
          <div class="spinner"></div>
          <div id="status"><p>Opening the app...</p></div>
          <div class="info"><strong>💡 Tip:</strong> If the app doesn't open automatically, make sure you have the TeeTime Golf app installed.</div>
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

    const tokenHash = cryptoUtils.hashToken(token);
    const magicLink = await magicLinkRepository.findByTokenHash(tokenHash);

    if (!magicLink) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired magic link.",
      });
    }

    if (magicLink.attempts >= magicLink.max_attempts) {
      return res.status(400).json({
        success: false,
        message: "Magic link has been used too many times.",
      });
    }

    await magicLinkRepository.markAsUsed(magicLink.id);

    // Find or create user
    let user = magicLink.user_id
      ? await userRepository.findById(magicLink.user_id)
      : await userRepository.findByEmail(magicLink.email);

    if (!user) {
      user = await userRepository.create({
        email: magicLink.email,
        isVerified: true,
      });
    }

    // Create session
    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
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

    const isRateLimited = await magicLinkRepository.isPhoneRateLimited(phoneNumber, 3);

    if (isRateLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many magic link requests. Please try again later.",
      });
    }

    let user = await userRepository.findByPhoneNumber(phoneNumber);

    if (user) {
      return res.status(400).json({
        success: false,
        message: "An account with this phone number already exists. Please login instead.",
      });
    }

    const token = cryptoUtils.generateToken(32);
    const tokenHash = cryptoUtils.hashToken(token);
    const expiryMinutes = parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES) || 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

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
      metadata: userData || null,
    });

    const webLink = `${process.env.API_URL || "http://localhost:3000"}/auth/verify-signup?token=${token}`;

    try {
      await twilioService.sendSMS(
        phoneNumber,
        `Welcome to TeeTime Golf! 🏌️ Complete your signup: ${webLink}\n\nThis link expires in ${expiryMinutes} minutes.`
      );

      return res.json({
        success: true,
        message: "Magic link sent to your phone via SMS.",
        expiresInMinutes: expiryMinutes,
        mode: "sms",
      });
    } catch (smsError) {
      logger.info(`\n🔗 [SMS MAGIC LINK] for ${phoneNumber}: ${webLink}\n`);

      return res.json({
        success: true,
        message: "Magic link generated. Check server console.",
        expiresInMinutes: expiryMinutes,
        mode: "console",
        ...(process.env.NODE_ENV === "development" && { devToken: token }),
      });
    }
  } catch (error) {
    logger.error("Error in requestSmsMagicLink:", error);
    next(error);
  }
};

/**
 * Verify SMS magic link and complete signup
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

    const tokenHash = cryptoUtils.hashToken(token);
    const magicLink = await magicLinkRepository.findByTokenHash(tokenHash);

    if (!magicLink) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired magic link.",
      });
    }

    if (magicLink.attempts >= magicLink.max_attempts) {
      return res.status(400).json({
        success: false,
        message: "Magic link has exceeded maximum attempts.",
      });
    }

    await magicLinkRepository.incrementAttempts(magicLink.id);
    await magicLinkRepository.markAsUsed(magicLink.id);

    const storedUserData = magicLink.metadata || {};

    const user = await userRepository.create({
      phoneNumber: magicLink.phone_number,
      email: storedUserData.email || magicLink.email,
      firstName: storedUserData.firstName || null,
      lastName: storedUserData.lastName || null,
      username: storedUserData.username || null,
      handicap: storedUserData.handicap || null,
      passwordHash: null,
      isVerified: true,
    });

    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
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

module.exports = {
  requestMagicLink,
  magicLinkRedirect,
  verifyMagicLink,
  requestSmsMagicLink,
  verifySmsMagicLink,
};
