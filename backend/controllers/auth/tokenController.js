const sessionService = require("../../services/sessionService");
const logger = require("../../config/logger");

/**
 * Token Controller
 * Handles token refresh operations
 */

/**
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    try {
      const result = await sessionService.refreshSession(token);

      return res.json({
        success: true,
        message: "Token refreshed successfully.",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || "Invalid or expired refresh token.",
      });
    }
  } catch (error) {
    logger.error("Error in refreshToken:", error);
    next(error);
  }
};

module.exports = {
  refreshToken,
};
