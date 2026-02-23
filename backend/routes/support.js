/**
 * Support routes - contact/support email from app
 */
const { Router } = require("express");
const { body } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");
const emailService = require("../services/emailService");
const logger = require("../config/logger");

const router = Router();

/**
 * @route   POST /api/support/email
 * @desc    Send support email (from sendgrid_from_email to sendgrid_to_email)
 * @body    { subject?, message } - message required
 * @access  Private (authenticated)
 */
router.post(
  "/email",
  authenticate,
  [
    body("message")
      .trim()
      .notEmpty()
      .withMessage("Message is required")
      .isLength({ max: 10000 })
      .withMessage("Message too long"),
    body("subject").optional().trim().isLength({ max: 200 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { subject, message } = req.body;
      const userEmail = req.user?.email || req.user?.phoneNumber || null;

      const result = await emailService.sendSupportEmail({
        subject: subject || "Support Request",
        body: message,
        userEmail,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || "Failed to send support email.",
        });
      }

      return res.json({
        success: true,
        message: "Support email sent successfully.",
      });
    } catch (error) {
      logger.error("[Support] sendSupportEmail error", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send support email.",
      });
    }
  }
);

module.exports = router;
