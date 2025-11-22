// Quick test server without Twilio/DB dependencies
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

// In-memory storage
const otpStore = new Map();
const otpSessions = new Map();
const users = new Map();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Helper functions
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const formatPhoneNumber = (rawValue = "") => {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/[^+\d]/g, "");
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  return digitsOnly ? `+${digitsOnly}` : "";
};

// Routes
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: "in-memory test mode",
    timestamp: new Date().toISOString(),
  });
});

app.post("/auth/request-otp", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: "Phone number is required.",
    });
  }

  const formattedNumber = formatPhoneNumber(phoneNumber);

  if (!formattedNumber || formattedNumber.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid phone number (E.164).",
    });
  }

  // Check if user already exists
  if (users.has(formattedNumber)) {
    return res.status(400).json({
      success: false,
      message:
        "An account with this number already exists. Please log in with your password.",
    });
  }

  const otp = generateOtp();

  // Save OTP
  otpStore.set(formattedNumber, {
    code: otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
  });

  console.log(`📱 OTP for ${formattedNumber}: ${otp}`);

  return res.json({
    success: true,
    message: "OTP sent successfully (check console for OTP in test mode)",
    phoneNumber: formattedNumber,
    otp: otp, // In test mode, return OTP directly
  });
});

app.post("/auth/verify-otp", async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({
      success: false,
      message: "Phone number and OTP are required.",
    });
  }

  const formattedNumber = formatPhoneNumber(phoneNumber);
  const record = otpStore.get(formattedNumber);

  if (!record) {
    return res.status(400).json({
      success: false,
      message: "No OTP found for this phone number.",
    });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(formattedNumber);
    return res.status(400).json({
      success: false,
      message: "OTP has expired. Please request a new one.",
    });
  }

  if (record.code !== otp.trim()) {
    record.attempts += 1;
    if (record.attempts >= 5) {
      otpStore.delete(formattedNumber);
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }
    return res.status(400).json({
      success: false,
      message: "Invalid OTP. Please try again.",
    });
  }

  // OTP verified - create session token
  const sessionToken = crypto.randomBytes(32).toString("hex");

  otpSessions.set(sessionToken, {
    phoneNumber: formattedNumber,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  otpStore.delete(formattedNumber);

  return res.json({
    success: true,
    message: "OTP verified successfully",
    sessionToken,
    phoneNumber: formattedNumber,
  });
});

app.post("/auth/set-password", async (req, res) => {
  const { sessionToken, password, name } = req.body;

  if (!sessionToken || !password) {
    return res.status(400).json({
      success: false,
      message: "Session token and password are required.",
    });
  }

  const session = otpSessions.get(sessionToken);

  if (!session) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired session. Please verify your OTP again.",
    });
  }

  if (Date.now() > session.expiresAt) {
    otpSessions.delete(sessionToken);
    return res.status(400).json({
      success: false,
      message: "Session expired. Please verify your OTP again.",
    });
  }

  // Create user account
  const bcrypt = require("bcryptjs");
  const hashedPassword = await bcrypt.hash(password, 10);

  users.set(session.phoneNumber, {
    phoneNumber: session.phoneNumber,
    name: name || "User",
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  });

  otpSessions.delete(sessionToken);

  console.log(`✅ User registered: ${session.phoneNumber}`);

  return res.json({
    success: true,
    message: "Account created successfully",
    phoneNumber: session.phoneNumber,
  });
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
  const user = users.get(formattedNumber);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials.",
    });
  }

  const bcrypt = require("bcryptjs");
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials.",
    });
  }

  // Create JWT token
  const jwt = require("jsonwebtoken");
  const token = jwt.sign({ phoneNumber: user.phoneNumber }, "test-secret-key", {
    expiresIn: "24h",
  });

  return res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      phoneNumber: user.phoneNumber,
      name: user.name,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log("\n🚀 Test Server Started");
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log("\n📝 Available Endpoints:");
  console.log("   POST /auth/request-otp");
  console.log("   POST /auth/verify-otp");
  console.log("   POST /auth/set-password");
  console.log("   POST /auth/login");
  console.log("   GET  /health");
  console.log("\n⚠️  Test Mode: OTP will be logged to console\n");
});
