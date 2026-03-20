/**
 * Support routes - contact/support email from app + persisted in user_reports (app_support)
 */
const { Router } = require("express");
const { body } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");
const emailService = require("../services/emailService");
const userReportRepository = require("../repositories/userReportRepository");
const logger = require("../config/logger");

const router = Router();

const CATEGORY_VALUES = ["bug_report", "feedback", "support"];

/**
 * @route   POST /api/support/email
 * @desc    Save row in user_reports (report_source=app_support), email SENDGRID_TO_EMAIL from SENDGRID_FROM_EMAIL
 * @body    { subject?, message, category? } — category: bug_report | feedback | support (default support)
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
    body("category")
      .optional()
      .trim()
      .isIn(CATEGORY_VALUES)
      .withMessage("category must be bug_report, feedback, or support"),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { subject, message } = req.body;
      const category = req.body.category && CATEGORY_VALUES.includes(req.body.category) ? req.body.category : "support";

      const subjectTrim = (subject || "").trim();
      const defaultSubjects = {
        bug_report: "Bug Report",
        feedback: "App Feedback",
        support: "Support Request",
      };
      const finalSubject = subjectTrim || defaultSubjects[category] || "Support Request";

      const userEmail = req.user?.email || null;
      const userPhone = req.user?.phoneNumber || null;
      const contactLine = userEmail || userPhone || "Not on file";
      const displayName = `${req.user?.firstName || ""} ${req.user?.lastName || ""}`.trim() || "App user";

      let reportRow;
      try {
        reportRow = await userReportRepository.createAppSupport({
          reporter_id: req.user.id,
          category,
          subject: finalSubject,
          message,
        });
      } catch (dbErr) {
        logger.error("[Support] user_reports insert failed", {
          message: dbErr.message,
          code: dbErr.code,
          details: dbErr.details,
          hint: dbErr.hint,
        });
        const devHint =
          process.env.NODE_ENV === "development"
            ? ` ${dbErr.message || ""} — apply backend/schema/migrations/012_user_reports_app_support.sql and ensure SUPABASE_SERVICE_ROLE_KEY is set.`
            : "";
        return res.status(500).json({
          success: false,
          message: `Could not save your request. Please try again later.${devHint}`,
        });
      }

      const categoryLabel = category.replace(/_/g, " ");
      const emailSubject = `[Tee Time Social — ${categoryLabel}] ${finalSubject}`;
      const reportId = reportRow.id;

      try {
        const result = await emailService.sendSupportEmail({
          subject: emailSubject,
          body: message,
          userEmail: contactLine,
          meta: {
            feedbackId: reportId,
            userId: req.user.id,
            displayName,
            category,
          },
        });

        if (!result.success) {
          await userReportRepository.setEmailResult(reportId, {
            delivered: false,
            emailError: result.message || "Email not sent",
          });
          return res.status(503).json({
            success: false,
            message:
              result.message ||
              "Support email could not be sent. Your message was saved; our team will still see it in the admin portal.",
            data: { id: reportId, saved: true },
          });
        }

        await userReportRepository.setEmailResult(reportId, { delivered: true, emailError: null });
      } catch (emailErr) {
        logger.error("[Support] sendSupportEmail error", emailErr);
        await userReportRepository.setEmailResult(reportId, {
          delivered: false,
          emailError: emailErr.message || "Send failed",
        });
        return res.status(503).json({
          success: false,
          message: "Your message was saved but email delivery failed. Please try again later.",
          data: { id: reportId, saved: true },
        });
      }

      return res.json({
        success: true,
        message: "Support email sent successfully.",
        data: { id: reportId },
      });
    } catch (error) {
      logger.error("[Support] sendSupportEmail route error", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send support email.",
      });
    }
  }
);

module.exports = router;
