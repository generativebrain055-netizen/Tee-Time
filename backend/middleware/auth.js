const { verifyAccessToken } = require("../utils/crypto");
const sessionRepository = require("../repositories/sessionRepository");
const userRepository = require("../repositories/userRepository");
const { AuthenticationError, ErrorCodes } = require("./errorHandler");

/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

/**
 * Authenticate user from JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Log authentication attempts for invite respond endpoints
    if (req.path && req.path.includes("/invites") && req.path.includes("/respond")) {
      const { invitesLogger } = require("../config/logger");
      invitesLogger.info("[AUTH] Authentication middleware called for respond endpoint", {
        event: "auth_middleware_called",
        method: req.method,
        path: req.path,
        hasAuthHeader: !!req.headers.authorization,
        authHeaderPrefix: req.headers.authorization?.substring(0, 20) || "none",
      });
    }
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (req.path && req.path.includes("/invites") && req.path.includes("/respond")) {
        const { invitesLogger } = require("../config/logger");
        invitesLogger.error("[AUTH] No token provided for respond endpoint", {
          event: "auth_no_token",
          path: req.path,
        });
      }
      throw new AuthenticationError(
        "No token provided",
        ErrorCodes.INVALID_TOKEN
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new AuthenticationError(
          "Token expired",
          ErrorCodes.TOKEN_EXPIRED
        );
      }
      throw new AuthenticationError("Invalid token", ErrorCodes.INVALID_TOKEN);
    }

    // Find session in database
    const crypto = require("crypto");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = await sessionRepository.findByAccessToken(tokenHash);

    if (!session) {
      throw new AuthenticationError(
        "Session not found",
        ErrorCodes.SESSION_EXPIRED
      );
    }

    // Verify session is active
    if (!session.is_active || new Date(session.expires_at) < new Date()) {
      throw new AuthenticationError(
        "Session expired",
        ErrorCodes.SESSION_EXPIRED
      );
    }

    // Find user
    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      throw new AuthenticationError("User not found", ErrorCodes.AUTH_FAILED);
    }

    // Check if user is active
    if (!user.is_active) {
      throw new AuthenticationError(
        "Account is deactivated",
        ErrorCodes.AUTH_FAILED
      );
    }

    // Check if account is locked
    if (user.is_locked && new Date(user.locked_until) > new Date()) {
      const lockDuration = Math.ceil(
        (new Date(user.locked_until) - new Date()) / 1000 / 60
      );
      throw new AuthenticationError(
        `Account is locked. Try again in ${lockDuration} minutes`,
        ErrorCodes.ACCOUNT_LOCKED
      );
    }

    // Attach user and session to request
    req.user = {
      id: user.id,
      phoneNumber: user.phone_number,
      email: user.email,
      isVerified: user.is_verified,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    req.session = {
      id: session.id,
      deviceId: session.device_id,
    };

    // Update last activity (async, don't wait)
    const logger = require("../config/logger");
    sessionRepository.updateLastActivity(session.id).catch((err) => {
      logger.error("Failed to update session activity", err);
    });

    // Log successful authentication for invite respond endpoints
    if (req.path && req.path.includes("/invites") && req.path.includes("/respond")) {
      const { invitesLogger } = require("../config/logger");
      invitesLogger.info("[AUTH] Authentication successful for respond endpoint", {
        event: "auth_success",
        path: req.path,
        userId: user.id,
      });
    }

    next();
  } catch (error) {
    // Log authentication failures for invite respond endpoints
    if (req.path && req.path.includes("/invites") && req.path.includes("/respond")) {
      const { invitesLogger } = require("../config/logger");
      invitesLogger.error("[AUTH] Authentication failed for respond endpoint", {
        event: "auth_failed",
        path: req.path,
        error: error.message,
        code: error.code,
      });
    }
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    await authenticate(req, res, () => {
      // Continue even if authentication fails
      next();
    });
  } catch (error) {
    // Swallow authentication errors for optional auth
    next();
  }
};

/**
 * Require verified user middleware
 * Must be used after authenticate
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return next(
      new AuthenticationError("Authentication required", ErrorCodes.AUTH_FAILED)
    );
  }

  if (!req.user.isVerified) {
    return next(
      new AuthenticationError(
        "Account not verified",
        ErrorCodes.ACCOUNT_NOT_VERIFIED
      )
    );
  }

  next();
};

/**
 * Check if user owns resource middleware
 */
const checkOwnership = (resourceIdParam = "id") => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceIdParam] || req.body.userId;

    if (!resourceUserId) {
      return next(new Error("Resource user ID not found"));
    }

    if (resourceUserId !== req.user.id) {
      return next(
        new AuthenticationError("Access denied", ErrorCodes.ACCESS_DENIED)
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  requireVerified,
  checkOwnership,
};
