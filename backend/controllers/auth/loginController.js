const bcrypt = require("bcryptjs");
const userRepository = require("../../repositories/userRepository");
const sessionService = require("../../services/sessionService");
const teeTimeRepository = require("../../repositories/teeTimeRepository");
const logger = require("../../config/logger");

/**
 * Login Controller
 * Handles login, logout, and logout all operations
 */

/**
 * Login with phone and password
 */
const login = async (req, res, next) => {
  try {
    const { phoneNumber, username, password, rememberMe } = req.body;

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
      const lockDuration = Math.ceil((new Date(user.locked_until) - new Date()) / 1000 / 60);
      return res.status(401).json({
        success: false,
        message: `Account is locked. Try again in ${lockDuration} minutes.`,
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await userRepository.incrementFailedLoginAttempts(user.id);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // Reset failed login attempts
    await userRepository.resetFailedLoginAttempts(user.id);

    // Mark past tee times as completed
    try {
      const completedTeeTimes = await teeTimeRepository.markPastTeeTimesCompleted();
      if (completedTeeTimes.length > 0) {
        logger.info(`Auto-completed ${completedTeeTimes.length} past tee times on login`);
      }
    } catch (err) {
      logger.error("Error marking past tee times as completed:", err);
    }

    // Create session
    const { accessToken, refreshToken, device } = await sessionService.createSession({
      userId: user.id,
      req,
      rememberMe: rememberMe || false,
    });

    // Update last login
    const ipAddress = req.ip || req.connection.remoteAddress;
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
        avatarUrl: user.avatar_url || null,
      },
    });
  } catch (error) {
    logger.error("Error in login:", error);
    next(error);
  }
};

/**
 * Logout current session
 */
const logout = async (req, res, next) => {
  try {
    if (req.session?.id) {
      await sessionService.revokeSession(req.session.id, req.user.id, "user_logout");
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
    const revokedCount = await sessionService.revokeAllSessions(
      req.user.id,
      req.session?.id,
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

module.exports = {
  login,
  logout,
  logoutAll,
};
