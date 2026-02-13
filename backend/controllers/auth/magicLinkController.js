const userRepository = require("../../repositories/userRepository");
const magicLinkRepository = require("../../repositories/magicLinkRepository");
const cryptoUtils = require("../../utils/crypto");
const { normalizePhoneToE164 } = require("../../utils/validation");
const sessionService = require("../../services/sessionService");
const emailService = require("../../services/emailService");
const twilioService = require("../../services/twilioService");
const logger = require("../../config/logger");
const { magicLinksLogger, twilioLogger } = require("../../config/logger");
const { formatUser } = require("../../formatters/userFormatter");

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
    const isRateLimited = await magicLinkRepository.isEmailRateLimited(email, 10);

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

    const deepLink = `teetimesocial://auth/magic-link?token=${token}`;
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

    const e164 = normalizePhoneToE164(phoneNumber);
    if (!e164) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format. Please use E.164 (e.g. +15551234567).",
      });
    }

    const isRateLimited = await magicLinkRepository.isPhoneRateLimited(e164, 10);

    if (isRateLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many magic link requests. Please try again later.",
      });
    }

    let user = await userRepository.findByPhoneNumber(e164);

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
      phoneNumber: e164,
      tokenHash,
      purpose: "signup",
      expiresAt,
      ipAddress,
      userAgent,
      maxAttempts: 3,
      metadata: userData || null,
    });

    // Deep link - opens app when user taps link on phone
    const deepLink = `teetimesocial://auth/magic-link?token=${token}`;
    const webFallback = `${process.env.API_URL || "https://api.teetimesocial.app"}/auth/magic-link-redirect?token=${token}`;

    // SMS: primary deep link; web fallback for tap on desktop/browser
    const smsBody = `TeeTime Golf: Verify your phone - ${deepLink}\nExpires in ${expiryMinutes} min. No app? ${webFallback}`;

    try {
      await twilioService.sendSMS(e164, smsBody);

      // Log to magic-links.log and twilio.log for testing (simulator can't receive SMS)
      magicLinksLogger.info(`SMS magic link sent to ${e164}`, {
        phoneNumber: e164,
        deepLink,
        webFallback,
        expiresInMinutes: expiryMinutes,
      });
      twilioLogger.info("[TWILIO] Magic link SMS sent", {
        feature: "magic_link",
        to: e164,
        deepLink,
        webFallback,
        expiresInMinutes: expiryMinutes,
      });

      return res.json({
        success: true,
        message: "Verification link sent to your phone.",
        expiresInMinutes: expiryMinutes,
        mode: "sms",
      });
    } catch (smsError) {
      logger.error("SMS send failed:", smsError);

      if (process.env.NODE_ENV === "development") {
        // Log to magic-links.log and twilio.log (SMS failed, link for dev/testing)
        magicLinksLogger.info(`[DEV] SMS failed - magic link for ${e164}`, {
          phoneNumber: e164,
          deepLink,
          webFallback,
          expiresInMinutes: expiryMinutes,
        });
        twilioLogger.info("[TWILIO] Magic link SMS failed - dev fallback", {
          feature: "magic_link",
          to: e164,
          deepLink,
          webFallback,
          expiresInMinutes: expiryMinutes,
        });
        logger.info(`[DEV] SMS magic link for ${e164}: ${deepLink}`);
        return res.json({
          success: true,
          message: "Verification link generated. Check server console in development.",
          expiresInMinutes: expiryMinutes,
          mode: "console",
          devToken: token,
          webFallback,
        });
      }

      return res.status(503).json({
        success: false,
        message: "We couldn't send the verification link. Please check your phone number and try again.",
      });
    }
  } catch (error) {
    logger.error("Error in requestSmsMagicLink:", error);
    next(error);
  }
};

/**
 * Request magic link via SMS for sign-in (existing users only)
 */
const requestSmsMagicLinkForLogin = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const e164 = normalizePhoneToE164(phoneNumber);
    if (!e164) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format. Please use E.164 (e.g. +15551234567).",
      });
    }

    const isRateLimited = await magicLinkRepository.isPhoneRateLimited(e164, 10);
    if (isRateLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many magic link requests. Please try again later.",
      });
    }

    const user = await userRepository.findByPhoneNumber(e164);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "No account found with this phone number. Please sign up first.",
      });
    }

    const token = cryptoUtils.generateToken(32);
    const tokenHash = cryptoUtils.hashToken(token);
    const expiryMinutes = parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES) || 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await magicLinkRepository.create({
      userId: user.id,
      email: null,
      phoneNumber: e164,
      tokenHash,
      purpose: "login",
      expiresAt,
      ipAddress,
      userAgent,
      maxAttempts: 3,
      metadata: null,
    });

    const deepLink = `teetimesocial://auth/magic-link?token=${token}`;
    const webFallback = `${process.env.API_URL || "https://api.teetimesocial.app"}/auth/magic-link-redirect?token=${token}`;
    const smsBody = `TeeTime Social: Sign in - ${deepLink}\nExpires in ${expiryMinutes} min. No app? ${webFallback}`;

    try {
      await twilioService.sendSMS(e164, smsBody);

      magicLinksLogger.info(`SMS magic link (login) sent to ${e164}`, {
        phoneNumber: e164,
        deepLink,
        webFallback,
        expiresInMinutes: expiryMinutes,
      });
      twilioLogger.info("[TWILIO] Magic link (login) SMS sent", {
        feature: "magic_link_login",
        to: e164,
        deepLink,
        webFallback,
        expiresInMinutes: expiryMinutes,
      });

      return res.json({
        success: true,
        message: "Sign-in link sent to your phone.",
        expiresInMinutes: expiryMinutes,
        mode: "sms",
      });
    } catch (smsError) {
      logger.error("SMS send failed (login):", smsError);

      if (process.env.NODE_ENV === "development") {
        magicLinksLogger.info(`[DEV] SMS failed - magic link (login) for ${e164}`, {
          phoneNumber: e164,
          deepLink,
          webFallback,
          expiresInMinutes: expiryMinutes,
        });
        twilioLogger.info("[TWILIO] Magic link (login) SMS failed - dev fallback", {
          feature: "magic_link_login",
          to: e164,
          deepLink,
          webFallback,
          expiresInMinutes: expiryMinutes,
        });
        logger.info(`[DEV] SMS magic link (login) for ${e164}: ${deepLink}`);
        return res.json({
          success: true,
          message: "Sign-in link generated. Check logs/magic-links.log or logs/twilio.log or server console.",
          expiresInMinutes: expiryMinutes,
          mode: "console",
          devToken: token,
          webFallback,
        });
      }

      return res.status(503).json({
        success: false,
        message: "We couldn't send the sign-in link. Please try again later.",
      });
    }
  } catch (error) {
    logger.error("Error in requestSmsMagicLinkForLogin:", error);
    next(error);
  }
};

/**
 * Verify SMS magic link token
 * - purpose=signup: returns phoneNumber (user completes onboarding, then register)
 * - purpose=login: creates session and returns accessToken, refreshToken, user
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
        message: "Invalid or expired verification link.",
      });
    }

    if (magicLink.attempts >= magicLink.max_attempts) {
      return res.status(400).json({
        success: false,
        message: "Verification link has exceeded maximum attempts.",
      });
    }

    await magicLinkRepository.markAsUsed(magicLink.id);

    logger.info(`Phone verified via SMS magic link: ${magicLink.phone_number} (purpose: ${magicLink.purpose})`);

    // purpose=login: create session and return tokens
    if (magicLink.purpose === "login" && magicLink.user_id) {
      const user = await userRepository.findById(magicLink.user_id);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User not found.",
        });
      }

      const { accessToken, refreshToken } = await sessionService.createSession({
        userId: user.id,
        req,
        rememberMe: true,
      });

      return res.json({
        success: true,
        message: "Signed in successfully.",
        accessToken,
        refreshToken,
        user: formatUser(user),
      });
    }

    // purpose=signup: Check if this is for OAuth user (has email in metadata)
    if (magicLink.purpose === "signup" && magicLink.metadata?.email && magicLink.metadata?.isOAuth) {
      const authProviderRepository = require("../../repositories/authProviderRepository");
      
      // Find OAuth user by email (check auth_providers for users with this email)
      const oauthUser = await userRepository.findByEmail(magicLink.metadata.email);
      
      if (oauthUser) {
        // Check if user has OAuth provider but no phone
        const providers = await authProviderRepository.findByUserId(oauthUser.id);
        if (providers && providers.length > 0 && !oauthUser.phone_number) {
          // Link phone to OAuth user
          await userRepository.updateProfile(oauthUser.id, {
            phoneNumber: magicLink.phone_number,
          });
          
          logger.info(`Linked phone ${magicLink.phone_number} to OAuth user ${oauthUser.id}`);
          
          // Create session and return tokens
          const { accessToken, refreshToken } = await sessionService.createSession({
            userId: oauthUser.id,
            req,
            rememberMe: true,
          });
          
          // Re-fetch user to get updated phone_number
          const updatedUser = await userRepository.findById(oauthUser.id);
          
          return res.json({
            success: true,
            message: "Phone number verified and linked successfully.",
            accessToken,
            refreshToken,
            user: formatUser(updatedUser),
            phoneNumber: magicLink.phone_number,
          });
        }
      }
    }

    // purpose=signup: return phoneNumber only (regular signup flow)
    return res.json({
      success: true,
      message: "Phone number verified successfully.",
      phoneNumber: magicLink.phone_number,
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
  requestSmsMagicLinkForLogin,
  verifySmsMagicLink,
};
