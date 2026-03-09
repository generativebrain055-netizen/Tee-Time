const path = require("path");
const fs = require("fs");

// Log any crash during startup (before other handlers are registered)
process.on("uncaughtException", (err) => {
  console.error("[CRASH] Uncaught exception:", err.message);
  console.error(err.stack);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[CRASH] Unhandled rejection:", reason);
  process.exit(1);
});

// Load .env from backend directory (same folder as server.js) - single source of truth
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const result = require("dotenv").config({ path: envPath });
  if (result.error) {
    console.error("[ENV] Failed to parse .env:", result.error.message);
    process.exit(1);
  }
  if (process.env.NODE_ENV !== "test") {
    console.log("[ENV] Loaded from", envPath);
    const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "JWT_SECRET"];
    const missing = required.filter((k) => !process.env[k] || process.env[k].trim() === "");
    if (missing.length) {
      console.error("[ENV] Missing or empty:", missing.join(", "));
      process.exit(1);
    }
    console.log("[ENV] Required vars present: SUPABASE_URL, SUPABASE_ANON_KEY, JWT_SECRET");
  }
} else {
  console.error("[ENV] File not found:", envPath);
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const https = require("https");
const http = require("http");

// Import configuration (catch load errors so we see the real reason for crash)
let testConnection;
try {
  const supabase = require("./config/supabase");
  testConnection = supabase.testConnection;
} catch (err) {
  console.error("[CRASH] Failed to load config/supabase:", err.message);
  console.error(err.stack);
  process.exit(1);
}
const logger = require("./config/logger");

// Import middleware
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { logApiRequest } = require("./middleware/analytics");
const securityScannerBlocker = require("./middleware/securityScanner");

// Import services
const schedulerService = require("./services/schedulerService");
const clubsService = require("./services/clubsService");
const avatarUploadService = require("./services/avatarUploadService");

// Import routes
const authRoutes = require("./routes/auth");
const availabilityRoutes = require("./routes/availability");
const rosterRoutes = require("./routes/roster");
const searchRoutes = require("./routes/search");
const teeTimeRoutes = require("./routes/teeTimes");
const inviteRoutes = require("./routes/invites");
const friendRoutes = require("./routes/friends");
const courseRoutes = require("./routes/courses");
const socialRateRoutes = require("./routes/socialRate");
const attendanceRoutes = require("./routes/attendance");
const notificationRoutes = require("./routes/notifications");
const draftRoutes = require("./routes/draft");
const messageRoutes = require("./routes/messages");
const adminRoutes = require("./routes/admin");
const supportRoutes = require("./routes/support");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration (ALLOWED_ORIGINS only used in production)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? allowedOrigins.length
          ? allowedOrigins
          : "*"
        : "*",
    credentials: true,
  }),
);

// Request logging - log ALL requests for debugging
app.use((req, res, next) => {
  // Log all PUT requests to /api/invites/*/respond
  if (req.method === "PUT" && req.path.includes("/invites") && req.path.includes("/respond")) {
    const { invitesLogger } = require("./config/logger");
    invitesLogger.info("[SERVER] Incoming PUT request to respond endpoint", {
      event: "server_request_received",
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      url: req.url,
      headers: {
        authorization: req.headers.authorization ? "Bearer ***" : "missing",
        "content-type": req.headers["content-type"],
      },
      body: req.body,
      params: req.params,
      query: req.query,
    });
  }
  next();
});

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    }),
  );
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Analytics logging (optional, can be enabled/disabled)
if (process.env.ENABLE_ANALYTICS !== "false") {
  app.use(logApiRequest);
}

// Security scanner blocker (blocks common scanner paths early)
app.use(securityScannerBlocker);

// Health check route (before other routes)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "TTS Golf App API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Test endpoint for invite respond - no auth required for testing
app.put("/api/invites/test/:id/respond", (req, res) => {
  const { invitesLogger } = require("./config/logger");
  invitesLogger.info("[TEST] Test endpoint hit", {
    event: "test_endpoint_hit",
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params,
    headers: {
      authorization: req.headers.authorization ? "Bearer ***" : "missing",
      "content-type": req.headers["content-type"],
    },
  });
  res.json({
    success: true,
    message: "Test endpoint reached successfully",
    received: {
      inviteId: req.params.id,
      body: req.body,
      method: req.method,
      path: req.path,
    },
  });
});

// API Routes
app.use("/auth", authRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/roster", rosterRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/tee-times", teeTimeRoutes);
app.use("/api/tee-times", attendanceRoutes); // Attendance routes under tee-times
app.use("/api/invites", inviteRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/social-rate", socialRateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/draft", draftRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ad-slots", require("./routes/adSlots"));
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    // Stop scheduler
    schedulerService.stop();
    logger.info("Scheduler stopped");

    // Supabase connections are managed automatically, no need to close
    logger.info("Supabase connections managed automatically");

    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
const startServer = async () => {
  try {
    // Test database connection (don't exit on failure - start server so we can see errors)
    const dbOk = await testConnection();
    if (!dbOk) {
      logger.warn(
        "Database connection failed. Server will start anyway; API requests may fail. Check SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env"
      );
    }

    // Ensure avatars bucket exists for profile photo uploads
    avatarUploadService.ensureBucketExists().catch((e) => {
      logger.warn("Avatar bucket check skipped:", e.message);
    });
    // Ensure chat-images bucket exists for chat image messages
    const chatImageUploadService = require("./services/chatImageUploadService");
    chatImageUploadService.ensureBucketExists().catch((e) => {
      logger.warn("Chat images bucket check skipped:", e.message);
    });
    const adCreativeUploadService = require("./services/adCreativeUploadService");
    adCreativeUploadService.ensureBucketExists().catch((e) => {
      logger.warn("Ad-creatives bucket check skipped:", e.message);
    });

    // Load golf clubs from CSV (non-blocking)
    clubsService.loadClubs().catch((e) => {
      logger.warn("Clubs load skipped:", e.message);
    });

    // Start scheduler for background tasks
    try {
      schedulerService.start();
    } catch (e) {
      logger.warn("Scheduler start skipped:", e.message);
    }

    // Check if SSL certificates are provided for HTTPS
    const useHTTPS = process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH;

    if (useHTTPS) {
      try {
        const httpsOptions = {
          key: fs.readFileSync(process.env.SSL_KEY_PATH),
          cert: fs.readFileSync(process.env.SSL_CERT_PATH),
        };

        // Add CA certificate if provided (for certificate chains)
        if (process.env.SSL_CA_PATH) {
          httpsOptions.ca = fs.readFileSync(process.env.SSL_CA_PATH);
        }

        // Create HTTPS server
        https.createServer(httpsOptions, app).listen(PORT, () => {
          logger.info(`HTTPS Server is running on port ${PORT}`);
          logger.info(`API URL: https://localhost:${PORT}`);
          logger.info(`Health check: https://localhost:${PORT}/health`);
          logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
        });
      } catch (sslError) {
        logger.error(
          "Failed to load SSL certificates, falling back to HTTP:",
          sslError,
        );
        // Fallback to HTTP if SSL fails
        http.createServer(app).listen(PORT, () => {
          logger.info(`HTTP Server is running on port ${PORT} (SSL failed)`);
          logger.info(`API URL: http://localhost:${PORT}`);
          logger.info(`Health check: http://localhost:${PORT}/health`);
          logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
        });
      }
    } else {
      // Create HTTP server (development)
      http.createServer(app).listen(PORT, () => {
        logger.info(`HTTP Server is running on port ${PORT}`);
        logger.info(`API URL: http://localhost:${PORT}`);
        logger.info(`Health check: http://localhost:${PORT}/health`);
        logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      });
    }
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = app;
