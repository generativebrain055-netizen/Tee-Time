const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const crypto = require("crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS) || 5 * 60 * 1000;
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS) || 30;
const OTP_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes to set password after OTP verification

// Lightweight in-memory stores for OTPs and verified sessions
const otpStore = new Map();
const otpSessions = new Map();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || undefined,
});

pool.on("error", (error) => {
  console.error("Unexpected Postgres error", error);
});

// Test database connection
let dbConnected = false;
pool
  .query("SELECT NOW()")
  .then(() => {
    console.log("✅ Database connected successfully (Supabase)");
    dbConnected = true;
    return ensureUsersTable();
  })
  .then(() => {
    console.log("✅ Database tables ready");
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error.message);
    console.warn("⚠️ Server will run in-memory mode (data won't persist)");
    dbConnected = false;
  });

const ensureUsersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone_number TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      handicap INTEGER,
      social_rate INTEGER DEFAULT 100,
      password_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};

const getUserByPhone = async (phoneNumber) => {
  if (!dbConnected) {
    console.warn("Database not connected, using in-memory storage");
    return null;
  }
  const { rows } = await pool.query(
    "SELECT id, phone_number, username, first_name, last_name, handicap, social_rate, password_hash FROM users WHERE phone_number = $1 LIMIT 1",
    [phoneNumber]
  );
  return rows[0] || null;
};

const getUserByUsername = async (username) => {
  if (!dbConnected) {
    console.warn("Database not connected, using in-memory storage");
    return null;
  }
  const { rows } = await pool.query(
    "SELECT id, phone_number, username, first_name, last_name, handicap, social_rate, password_hash FROM users WHERE username = $1 LIMIT 1",
    [username]
  );
  return rows[0] || null;
};

const saveUserPassword = async (phoneNumber, passwordHash) => {
  if (!dbConnected) {
    console.warn("Database not connected, password not persisted");
    return { id: Date.now(), phone_number: phoneNumber };
  }
  const { rows } = await pool.query(
    `INSERT INTO users (phone_number, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (phone_number)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()
     RETURNING id, phone_number`,
    [phoneNumber, passwordHash]
  );

  return rows[0];
};

const createSessionToken = () => crypto.randomBytes(24).toString("hex");

const pruneOtpSessions = () => {
  const now = Date.now();
  otpSessions.forEach((session, token) => {
    if (session.expiresAt <= now) {
      otpSessions.delete(token);
    }
  });
};

const buildTwilioClient = () => {
  const sid = (process.env.TWILIO_SID || "").trim();
  const secret = (process.env.TWILIO_SECRET || "").trim();
  const configuredAccountSid = (process.env.TWILIO_ACCOUNT_SID || "").trim();

  if (!sid || !secret) {
    console.warn(
      "Twilio credentials are missing. OTP SMS cannot be sent until they are configured."
    );
    return null;
  }

  if (!process.env.TWILIO_FROM_NUMBER) {
    console.warn(
      "TWILIO_FROM_NUMBER is not set. Set it to your Twilio-provisioned phone number."
    );
  }

  const baseArgs = [sid, secret];
  const usingApiKey = sid.startsWith("SK");
  const derivedAccountSid = configuredAccountSid.startsWith("AC")
    ? configuredAccountSid
    : sid.startsWith("AC")
    ? sid
    : "";

  if (usingApiKey && !derivedAccountSid) {
    console.warn(
      "TWILIO_ACCOUNT_SID is required (and must start with AC) when using API Keys (SID starts with SK)."
    );
    return null;
  }

  if (derivedAccountSid && !derivedAccountSid.startsWith("AC")) {
    console.warn("Invalid TWILIO_ACCOUNT_SID provided. It must start with AC.");
    return null;
  }

  const options =
    usingApiKey || (derivedAccountSid && derivedAccountSid !== sid)
      ? { accountSid: derivedAccountSid }
      : undefined;

  return options ? twilio(...baseArgs, options) : twilio(...baseArgs);
};

let twilioClient = null;
try {
  twilioClient = buildTwilioClient();
} catch (error) {
  console.warn(`Disabling Twilio SMS client: ${error.message}`);
  twilioClient = null;
}

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const formatPhoneNumber = (rawValue = "") => {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    return trimmed.replace(/[^+\d]/g, "");
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  return digitsOnly ? `+${digitsOnly}` : "";
};

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const saveOtp = (phoneNumber, code) => {
  otpStore.set(phoneNumber, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
};

const pruneExpiredOtps = () => {
  const now = Date.now();
  otpStore.forEach((record, phone) => {
    if (record.expiresAt <= now) {
      otpStore.delete(phone);
    }
  });
};

setInterval(pruneExpiredOtps, 60 * 1000);
setInterval(pruneOtpSessions, 60 * 1000);

app.post("/auth/request-otp", async (req, res) => {
  if (!twilioClient) {
    return res.status(500).json({
      success: false,
      message: "Twilio is not configured on the server.",
    });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number is required." });
  }

  const formattedNumber = formatPhoneNumber(phoneNumber);

  if (!formattedNumber || formattedNumber.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid phone number (E.164).",
    });
  }

  try {
    const existingUser = await getUserByPhone(formattedNumber);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "An account with this number already exists. Please log in with your password.",
      });
    }
  } catch (error) {
    console.error("Database error while checking phone number", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify phone number at the moment.",
    });
  }

  if (!process.env.TWILIO_FROM_NUMBER) {
    return res.status(500).json({
      success: false,
      message: "Server missing TWILIO_FROM_NUMBER configuration.",
    });
  }

  const otp = generateOtp();
  saveOtp(formattedNumber, otp);

  try {
    await twilioClient.messages.create({
      body: `Your TeeTime verification code is ${otp}`,
      from: process.env.TWILIO_FROM_NUMBER,
      to: formattedNumber,
    });

    return res.json({
      success: true,
      message: "OTP sent successfully.",
      expiresInMs: OTP_TTL_MS,
      resendAfterSeconds: OTP_RESEND_SECONDS,
    });
  } catch (error) {
    console.error("Twilio send error:", error);

    // Fallback for testing/development or invalid credentials
    // If DB is not connected or Twilio fails, we log the OTP to console for testing
    if (
      !dbConnected ||
      error.code === 20404 ||
      error.code === 20003 ||
      error.status === 404
    ) {
      console.log(`\n👉 [TEST MODE] OTP for ${formattedNumber}: ${otp}\n`);
      return res.json({
        success: true,
        message: "OTP sent (simulated). Check server console.",
        expiresInMs: OTP_TTL_MS,
        resendAfterSeconds: OTP_RESEND_SECONDS,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to send OTP at the moment. Please try again later.",
    });
  }
});

app.post("/auth/verify-otp", async (req, res) => {
  const { phoneNumber, otp, firstName, lastName, username, handicap, password } = req.body;

  console.log('Verify OTP request:', { phoneNumber, otp, firstName, lastName, username, handicap, hasPassword: !!password });

  if (!phoneNumber || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number and OTP are required." });
  }

  const formattedNumber = formatPhoneNumber(phoneNumber);
  const record = otpStore.get(formattedNumber);

  console.log('OTP record:', record ? 'Found' : 'Not found');
  console.log('Current time:', Date.now());
  if (record) {
    console.log('Expires at:', record.expiresAt);
    console.log('Time remaining:', (record.expiresAt - Date.now()) / 1000, 'seconds');
  }

  if (!record || Date.now() > record.expiresAt) {
    otpStore.delete(formattedNumber);
    return res
      .status(400)
      .json({ success: false, message: "OTP expired or not found. Please request a new one." });
  }

  if (record.code !== otp) {
    record.attempts += 1;

    if (record.attempts >= 5) {
      otpStore.delete(formattedNumber);
      return res.status(400).json({
        success: false,
        message: "Too many invalid attempts. Request a new OTP.",
      });
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid OTP. Please try again." });
  }

  try {
    const existingUser = await getUserByPhone(formattedNumber);
    if (existingUser) {
      otpStore.delete(formattedNumber);
      return res.json({
        success: true,
        message: "Account verified. Welcome back!",
        user: {
          id: existingUser.id,
          phoneNumber: existingUser.phone_number,
          username: existingUser.username,
          firstName: existingUser.first_name,
          lastName: existingUser.last_name,
          handicap: existingUser.handicap,
          socialRate: existingUser.social_rate,
        },
        token: createSessionToken(),
      });
    }

    // Validate username if provided
    if (username) {
      const usernameExists = await getUserByUsername(username);
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: "Username already taken. Please choose another.",
        });
      }
    }

    // Create new user
    if (dbConnected) {
      const passwordHash = password ? await bcrypt.hash(String(password), 10) : null;
      const { rows } = await pool.query(
        `INSERT INTO users (phone_number, username, first_name, last_name, handicap, social_rate, password_hash)
         VALUES ($1, $2, $3, $4, $5, 100, $6)
         RETURNING id, phone_number, username, first_name, last_name, handicap, social_rate`,
        [formattedNumber, username || null, firstName || null, lastName || null, handicap ? parseInt(handicap) : null, passwordHash]
      );

      otpStore.delete(formattedNumber);
      
      return res.json({
        success: true,
        message: "Account created successfully!",
        user: {
          id: rows[0].id,
          phoneNumber: rows[0].phone_number,
          username: rows[0].username,
          firstName: rows[0].first_name,
          lastName: rows[0].last_name,
          handicap: rows[0].handicap,
          socialRate: rows[0].social_rate,
        },
        token: createSessionToken(),
      });
    } else {
      otpStore.delete(formattedNumber);
      return res.json({
        success: true,
        message: "Account created (in-memory mode).",
        user: {
          id: Date.now(),
          phoneNumber: formattedNumber,
          username: username || null,
          firstName: firstName || null,
          lastName: lastName || null,
          handicap: handicap ? parseInt(handicap) : null,
          socialRate: 100,
        },
        token: createSessionToken(),
      });
    }
  } catch (error) {
    console.error("Database error while verifying OTP", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP at the moment.",
    });
  }
});

app.post("/auth/set-password", async (req, res) => {
  const { phoneNumber, otpSessionToken, password } = req.body;

  if (!phoneNumber || !otpSessionToken || !password) {
    return res.status(400).json({
      success: false,
      message: "Phone number, OTP session token, and password are required.",
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long.",
    });
  }

  const formattedNumber = formatPhoneNumber(phoneNumber);
  const session = otpSessions.get(otpSessionToken);

  if (!session || session.phoneNumber !== formattedNumber) {
    return res.status(400).json({
      success: false,
      message: "OTP session is invalid. Please restart signup.",
    });
  }

  if (Date.now() > session.expiresAt) {
    otpSessions.delete(otpSessionToken);
    return res.status(400).json({
      success: false,
      message: "OTP session expired. Request a new code.",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(String(password), 10);
    await saveUserPassword(formattedNumber, passwordHash);
    otpSessions.delete(otpSessionToken);

    return res.json({
      success: true,
      message: "Password saved successfully. You're now logged in.",
      token: createSessionToken(),
    });
  } catch (error) {
    console.error("Database error while saving password", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save password right now.",
    });
  }
});

app.post("/auth/login", async (req, res) => {
  const { phoneNumber, username, password } = req.body;

  if ((!phoneNumber && !username) || !password) {
    return res.status(400).json({
      success: false,
      message: "Username/phone number and password are required.",
    });
  }

  try {
    let user;
    
    if (username) {
      user = await getUserByUsername(username);
    } else {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      user = await getUserByPhone(formattedNumber);
    }

    if (!user || !user.password_hash) {
      return res.status(400).json({
        success: false,
        message: "No account found. Sign up first.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      String(password),
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials. Please check your username/phone and password.",
      });
    }

    return res.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
        socialRate: user.social_rate,
      },
      token: createSessionToken(),
    });
  } catch (error) {
    console.error("Database error while logging in", error);
    return res.status(500).json({
      success: false,
      message: "Unable to log in right now. Please try again later.",
    });
  }
});

// Import new utilities and middleware
const cryptoUtils = require('./utils/crypto');
const sessionRepository = require('./repositories/sessionRepository');
const magicLinkRepository = require('./repositories/magicLinkRepository');
const { logEvent } = require('./middleware/analytics');
const { extractDeviceInfo, saveDevice } = require('./utils/deviceFingerprint');

// Refresh token endpoint
app.post("/auth/refresh", async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = cryptoUtils.verifyRefreshToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }
    
    // Find session by refresh token hash
    const tokenHash = cryptoUtils.hashToken(token);
    const session = await sessionRepository.findByRefreshToken(tokenHash);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session not found or expired.',
      });
    }
    
    // Generate new tokens
    const newAccessToken = cryptoUtils.generateAccessToken(
      { userId: session.user_id, sessionId: session.id },
      process.env.JWT_ACCESS_EXPIRY || '15m'
    );
    
    const newRefreshToken = cryptoUtils.generateRefreshToken(
      { userId: session.user_id, sessionId: session.id, tokenFamilyId: session.token_family_id },
      process.env.JWT_REFRESH_EXPIRY || '7d'
    );
    
    // Update session with new token hashes
    const newAccessTokenHash = cryptoUtils.hashToken(newAccessToken);
    const newRefreshTokenHash = cryptoUtils.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await sessionRepository.updateTokens(
      session.id,
      newAccessTokenHash,
      newRefreshTokenHash,
      expiresAt
    );
    
    // Log analytics event
    await logEvent({
      userId: session.user_id,
      eventType: 'auth',
      eventCategory: 'authentication',
      eventName: 'token_refreshed',
      eventData: { success: true },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      sessionId: session.id,
    });
    
    return res.json({
      success: true,
      message: 'Token refreshed successfully.',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Error in refreshToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to refresh token.',
    });
  }
});

// Magic link request endpoint
app.post("/auth/magic-link", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required.',
      });
    }
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Check rate limiting
    const isRateLimited = await magicLinkRepository.isEmailRateLimited(email, 3);
    
    if (isRateLimited) {
      return res.status(429).json({
        success: false,
        message: 'Too many magic link requests. Please try again later.',
      });
    }
    
    // Find user by email
    let user = null;
    if (dbConnected) {
      const { rows } = await pool.query(
        'SELECT id, email, phone_number FROM users WHERE email = $1 LIMIT 1',
        [email]
      );
      user = rows[0] || null;
    }
    
    const purpose = user ? 'login' : 'signup';
    
    // Generate magic link token
    const token = cryptoUtils.generateToken(32);
    const tokenHash = cryptoUtils.hashToken(token);
    
    // Calculate expiry
    const expiryMinutes = parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES) || 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    // Save magic link to database
    if (dbConnected) {
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
    }
    
    // Send email via SendGrid
    const sgMail = require('@sendgrid/mail');
    const apiKey = process.env.SENDGRID_API_KEY;
    
    const magicLink = `${process.env.API_URL}/auth/verify-magic?token=${token}`;
    
    if (!apiKey) {
      console.log(`\n🔗 [MAGIC LINK] for ${email}:\n${magicLink}\n`);
      
      // Log analytics event
      await logEvent({
        userId: user?.id,
        eventType: 'auth',
        eventCategory: 'authentication',
        eventName: 'magic_link_requested',
        eventData: { success: true, mode: 'console' },
        ipAddress,
        userAgent,
      });
      
      return res.json({
        success: true,
        message: 'Magic link generated. Check server console.',
        mode: 'console',
      });
    }
    
    sgMail.setApiKey(apiKey);
    
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@teetimeapp.com';
    const fromName = process.env.SENDGRID_FROM_NAME || 'TeeTime Golf App';
    
    const msg = {
      to: email,
      from: { email: fromEmail, name: fromName },
      subject: purpose === 'login' ? 'Your TeeTime Login Link' : 'Welcome to TeeTime Golf',
      text: `Click this link to ${purpose === 'login' ? 'log in' : 'sign up'}: ${magicLink}\n\nThis link expires in ${expiryMinutes} minutes.`,
      html: `
        <h2>${purpose === 'login' ? 'Log in to TeeTime Golf' : 'Welcome to TeeTime Golf'}</h2>
        <p>Click the button below to ${purpose === 'login' ? 'log in' : 'complete your signup'}:</p>
        <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
          ${purpose === 'login' ? 'Log In' : 'Sign Up'}
        </a>
        <p>Or copy and paste this link: ${magicLink}</p>
        <p><small>This link expires in ${expiryMinutes} minutes.</small></p>
      `,
    };
    
    try {
      await sgMail.send(msg);
      console.log(`Magic link sent to ${email}`);
      
      // Log analytics event
      await logEvent({
        userId: user?.id,
        eventType: 'auth',
        eventCategory: 'authentication',
        eventName: 'magic_link_requested',
        eventData: { success: true, mode: 'email' },
        ipAddress,
        userAgent,
      });
      
      return res.json({
        success: true,
        message: 'Magic link sent to your email.',
        expiresInMinutes: expiryMinutes,
      });
    } catch (error) {
      console.error('SendGrid error:', error);
      
      // Fallback to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔗 [SENDGRID FAILED - FALLBACK] Magic link for ${email}:\n${magicLink}\n`);
        
        await logEvent({
          userId: user?.id,
          eventType: 'auth',
          eventCategory: 'authentication',
          eventName: 'magic_link_requested',
          eventData: { success: true, mode: 'console_fallback' },
          ipAddress,
          userAgent,
        });
        
        return res.json({
          success: true,
          message: 'Magic link generated. Check server console.',
          mode: 'console_fallback',
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error in requestMagicLink:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to send magic link.',
    });
  }
});

// Magic link verification endpoint
app.get("/auth/verify-magic", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Magic link token is required.',
      });
    }
    
    // Hash token and find in database
    const tokenHash = cryptoUtils.hashToken(token);
    const magicLink = await magicLinkRepository.findByTokenHash(tokenHash);
    
    if (!magicLink) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired magic link.',
      });
    }
    
    // Check max attempts
    if (magicLink.attempts >= magicLink.max_attempts) {
      return res.status(400).json({
        success: false,
        message: 'Magic link has been used too many times.',
      });
    }
    
    // Mark as used
    await magicLinkRepository.markAsUsed(magicLink.id);
    
    // Find or create user
    let user = null;
    if (magicLink.user_id && dbConnected) {
      const { rows } = await pool.query(
        'SELECT id, email, phone_number FROM users WHERE id = $1 LIMIT 1',
        [magicLink.user_id]
      );
      user = rows[0] || null;
    }
    
    if (!user && dbConnected) {
      const { rows } = await pool.query(
        'SELECT id, email, phone_number FROM users WHERE email = $1 LIMIT 1',
        [magicLink.email]
      );
      user = rows[0] || null;
    }
    
    if (!user && dbConnected) {
      // Create new user
      const { rows } = await pool.query(
        `INSERT INTO users (email, is_verified) VALUES ($1, true) 
         RETURNING id, email, phone_number`,
        [magicLink.email]
      );
      user = rows[0];
    }
    
    if (!user) {
      user = { id: Date.now(), email: magicLink.email, phone_number: null };
    }
    
    // Generate session tokens
    const tokenFamilyId = cryptoUtils.generateSessionId();
    const accessToken = cryptoUtils.generateAccessToken(
      { userId: user.id },
      process.env.JWT_ACCESS_EXPIRY || '15m'
    );
    const refreshToken = cryptoUtils.generateRefreshToken(
      { userId: user.id, tokenFamilyId },
      process.env.JWT_REFRESH_EXPIRY || '7d'
    );
    
    // Create session
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Extract and save device info
    const deviceInfo = extractDeviceInfo(req);
    const device = await saveDevice(user.id, deviceInfo);
    
    if (dbConnected) {
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
    }
    
    // Log analytics event
    await logEvent({
      userId: user.id,
      eventType: 'auth',
      eventCategory: 'authentication',
      eventName: 'magic_link_verified',
      eventData: { success: true },
      ipAddress,
      userAgent,
      deviceId: device?.id,
    });
    
    return res.json({
      success: true,
      message: 'Magic link verified successfully.',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phone_number,
      },
    });
  } catch (error) {
    console.error('Error in verifyMagicLink:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify magic link.',
    });
  }
});

// Basic health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "TTS Golf App API is running" });
});

const startServer = async () => {
  try {
    // Start server regardless of DB connection
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
