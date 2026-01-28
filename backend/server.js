const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const https = require("https");
const http = require("http");
const fs = require("fs");

// Import configuration
const { testConnection } = require("./config/supabase");
const logger = require("./config/logger");

// Import middleware
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { logApiRequest } = require("./middleware/analytics");

// Import services
const schedulerService = require("./services/schedulerService");
const clubsService = require("./services/clubsService");

// Import routes
const authRoutes = require("./routes/auth");
const rosterRoutes = require("./routes/roster");
const teeTimeRoutes = require("./routes/teeTimes");
const inviteRoutes = require("./routes/invites");
const friendRoutes = require("./routes/friends");
const courseRoutes = require("./routes/courses");
const socialRateRoutes = require("./routes/socialRate");
const attendanceRoutes = require("./routes/attendance");
const notificationRoutes = require("./routes/notifications");
const draftRoutes = require("./routes/draft");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",")
        : "*",
    credentials: true,
  }),
);

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

// Health check route (before other routes)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "TTS Golf App API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Routes
app.use("/auth", authRoutes);
app.use("/api/roster", rosterRoutes);
app.use("/api/tee-times", teeTimeRoutes);
app.use("/api/tee-times", attendanceRoutes); // Attendance routes under tee-times
app.use("/api/invites", inviteRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/social-rate", socialRateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/draft", draftRoutes);

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
    // Test database connection
    await testConnection();

    // Load golf clubs from CSV
    await clubsService.loadClubs();

    // Start scheduler for background tasks
    schedulerService.start();

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

startServer();

module.exports = app;
