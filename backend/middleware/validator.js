const { validationResult } = require("express-validator");
const { ValidationError } = require("./errorHandler");

/**
 * Validation Middleware
 * Processes validation results from express-validator
 */

/**
 * Check validation results and throw error if invalid
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Log validation errors for invite responses
    if (req.path?.includes('/invites') && req.path?.includes('/respond')) {
      const { invitesLogger } = require("../config/logger");
      invitesLogger.warn("[INVITE] Validation failed for respond request", {
        event: "respond_validation_failed",
        path: req.path,
        inviteId: req.params?.id,
        userId: req.user?.id,
        errors: errors.array(),
        body: req.body,
      });
    }
    
    const formattedErrors = errors.array().reduce((acc, error) => {
      acc[error.path || error.param] = error.msg;
      return acc;
    }, {});

    throw new ValidationError("Validation failed", formattedErrors);
  }

  next();
};

module.exports = {
  validateRequest,
};
