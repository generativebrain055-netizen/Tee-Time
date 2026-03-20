const sgMail = require("@sendgrid/mail");
const logger = require("../config/logger");

/**
 * Email Service
 * Handles all email operations via SendGrid
 */

/**
 * Initialize SendGrid
 */
const initializeSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (apiKey) {
    sgMail.setApiKey(apiKey);
    return true;
  }
  return false;
};

/**
 * Check if SendGrid is configured
 */
const isConfigured = () => !!process.env.SENDGRID_API_KEY;

/**
 * Send magic link email
 * @param {Object} params - Email parameters
 * @returns {Promise<Object>} Send result
 */
const sendMagicLinkEmail = async ({ email, token, purpose }) => {
  const expiryMinutes = parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES) || 15;
  const universalLink = `${process.env.API_URL}/auth/magic-link-redirect?token=${token}`;

  if (!isConfigured()) {
    logger.warn("SendGrid API key not configured. Magic link logged to console.");
    logger.info(`\n🔗 [MAGIC LINK] for ${email}:\n${universalLink}\n`);
    return { success: true, mode: "console" };
  }

  initializeSendGrid();

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@teetimeapp.com";
  const fromName = process.env.SENDGRID_FROM_NAME || "TeeTime Golf App";

  const msg = {
    to: email,
    from: { email: fromEmail, name: fromName },
    subject: purpose === "login" ? "Your TeeTime Login Link" : "Welcome to TeeTime Golf",
    text: `Click this link to ${purpose === "login" ? "log in" : "sign up"}: ${universalLink}\n\nThis link expires in ${expiryMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">${purpose === "login" ? "Log in to TeeTime Golf" : "Welcome to TeeTime Golf"}</h2>
        <p style="color: #555; font-size: 16px;">Click the button below to ${purpose === "login" ? "log in" : "complete your signup"}:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${universalLink}" style="display: inline-block; padding: 15px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            ${purpose === "login" ? "🏌️ Log In to TeeTime" : "🏌️ Get Started"}
          </a>
        </div>
        
        <p style="color: #777; font-size: 14px;">Or copy and paste this link in your browser:</p>
        <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #555;">
          ${universalLink}
        </p>
        
        <div style="margin-top: 30px; padding: 15px; background: #f0f8ff; border-left: 4px solid #4CAF50; border-radius: 5px;">
          <p style="margin: 0; color: #555; font-size: 14px;">
            <strong>📱 Using the mobile app?</strong><br>
            The link will automatically open the TeeTime Golf app on your device.
          </p>
        </div>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          <small>⏱️ This link expires in ${expiryMinutes} minutes.</small><br>
          <small>If you didn't request this, you can safely ignore this email.</small>
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    logger.info(`Magic link sent to ${email}`);
    return { success: true, mode: "email", expiresInMinutes: expiryMinutes };
  } catch (error) {
    logger.error("SendGrid error:", error);

    if (process.env.NODE_ENV === "development") {
      logger.info(`\n🔗 [SENDGRID FAILED - FALLBACK] Magic link for ${email}:\n${universalLink}\n`);
      return { success: true, mode: "console_fallback" };
    }

    throw error;
  }
};

/**
 * Send support/contact email from app (from SENDGRID_FROM_EMAIL to SENDGRID_TO_EMAIL).
 * @param {Object} params
 * @param {string} params.subject
 * @param {string} params.body - Plain message (also used as main body)
 * @param {string} [params.userEmail] - Submitter contact hint
 * @param {Object} [params.meta] - Structured fields for admin inbox
 * @param {string} [params.meta.feedbackId]
 * @param {string} [params.meta.userId]
 * @param {string} [params.meta.displayName]
 * @param {string} [params.meta.category]
 * @returns {Promise<Object>} { success, message? }
 */
const sendSupportEmail = async ({ subject, body, userEmail, meta = {} }) => {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const toEmail = process.env.SENDGRID_TO_EMAIL;

  if (!fromEmail || !toEmail) {
    logger.warn("SENDGRID_FROM_EMAIL or SENDGRID_TO_EMAIL not set. Support email skipped.");
    return { success: false, message: "Support email not configured." };
  }

  const metaLines = [];
  if (meta.feedbackId) metaLines.push(`Submission ID: ${meta.feedbackId}`);
  if (meta.userId) metaLines.push(`User ID: ${meta.userId}`);
  if (meta.displayName) metaLines.push(`Name: ${meta.displayName}`);
  if (meta.category) metaLines.push(`Category: ${meta.category}`);
  if (userEmail) metaLines.push(`Contact: ${userEmail}`);
  const metaBlock = metaLines.length ? `${metaLines.join("\n")}\n\n` : userEmail ? `Contact: ${userEmail}\n\n` : "";

  const safeBody = String(body || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fullText = metaBlock + body;
  const escapeCell = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  const metaHtmlRows = metaLines
    .map((line) => {
      const [k, ...rest] = line.split(": ");
      const v = rest.join(": ");
      return `<tr><td style="padding:4px 12px 4px 0;font-weight:600;color:#444;">${escapeCell(k)}</td><td style="padding:4px 0;">${escapeCell(v)}</td></tr>`;
    })
    .join("");

  if (!isConfigured()) {
    logger.warn("SendGrid API key not configured. Support email logged to console.");
    logger.info(`\n📧 [SUPPORT EMAIL] to ${toEmail}\nSubject: ${subject}\n\n${fullText}\n`);
    return { success: true, mode: "console" };
  }

  initializeSendGrid();

  const fromName = process.env.SENDGRID_FROM_NAME || "TeeTime Golf App";
  const text = fullText;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px;">
      ${metaHtmlRows ? `<table style="margin-bottom:16px;border-collapse:collapse;">${metaHtmlRows}</table>` : ""}
      <p style="white-space: pre-wrap; color: #222;">${safeBody}</p>
    </div>
  `;

  const msg = {
    to: toEmail,
    from: { email: fromEmail, name: fromName },
    subject: subject || "Support Request",
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    logger.info(`Support email sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    const httpStatus = error?.code || error?.response?.code;
    const sgMsg = error?.response?.body?.errors?.[0]?.message;
    logger.error("SendGrid support email error:", {
      httpStatus,
      sendGridMessage: sgMsg,
      hint:
        httpStatus === 401
          ? "SENDGRID_API_KEY is invalid, expired, or revoked — create a new key in SendGrid (Settings → API Keys) with Mail Send permission."
          : undefined,
    });

    // 401 = bad API key (not an app bug). Return a clear message so /api/support/email can still mark DB + respond 503 cleanly.
    if (httpStatus === 401) {
      return {
        success: false,
        message:
          "SendGrid rejected the API key (invalid, expired, or revoked). Update SENDGRID_API_KEY in backend .env with a valid key from https://app.sendgrid.com/settings/api_keys (enable Mail Send).",
      };
    }

    throw error;
  }
};

module.exports = {
  isConfigured,
  sendMagicLinkEmail,
  sendSupportEmail,
};
