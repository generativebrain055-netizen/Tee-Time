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
