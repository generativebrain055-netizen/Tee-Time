const { verifyAdminToken } = require("../utils/crypto");
const { AuthenticationError, ErrorCodes } = require("./errorHandler");

/**
 * Authenticate super admin from JWT (admin audience).
 * Use after admin login; rejects user JWTs.
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError(
        "Admin token required",
        ErrorCodes.INVALID_TOKEN
      );
    }
    const token = authHeader.substring(7);
    const decoded = verifyAdminToken(token);
    req.admin = { role: decoded.role, sub: decoded.sub };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new AuthenticationError("Admin session expired", ErrorCodes.TOKEN_EXPIRED)
      );
    }
    next(error);
  }
};

module.exports = { authenticateAdmin };
