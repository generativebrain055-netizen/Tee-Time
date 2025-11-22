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
    "SELECT id, phone_number, first_name, last_name, handicap, social_rate, password_hash FROM users WHERE phone_number = $1 LIMIT 1",
    [phoneNumber]
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
  const { phoneNumber, otp, firstName, lastName, handicap } = req.body;

  console.log('Verify OTP request:', { phoneNumber, otp, firstName, lastName, handicap });

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
          firstName: existingUser.first_name,
          lastName: existingUser.last_name,
          handicap: existingUser.handicap,
          socialRate: existingUser.social_rate,
        },
        token: createSessionToken(),
      });
    }

    // Create new user
    if (dbConnected) {
      const { rows } = await pool.query(
        `INSERT INTO users (phone_number, first_name, last_name, handicap, social_rate)
         VALUES ($1, $2, $3, $4, 100)
         RETURNING id, phone_number, first_name, last_name, handicap, social_rate`,
        [formattedNumber, firstName || null, lastName || null, handicap ? parseInt(handicap) : null]
      );

      otpStore.delete(formattedNumber);
      
      return res.json({
        success: true,
        message: "Account created successfully!",
        user: {
          id: rows[0].id,
          phoneNumber: rows[0].phone_number,
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
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({
      success: false,
      message: "Phone number and password are required.",
    });
  }

  const formattedNumber = formatPhoneNumber(phoneNumber);

  try {
    const user = await getUserByPhone(formattedNumber);

    if (!user || !user.password_hash) {
      return res.status(400).json({
        success: false,
        message: "No account found. Sign up with your phone number first.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      String(password),
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid credentials. Double-check your phone number and password.",
      });
    }

    return res.json({
      success: true,
      message: "Login successful.",
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
