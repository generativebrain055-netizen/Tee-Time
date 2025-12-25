const crypto = require("crypto");
const { pool } = require("../config/database");
const logger = require("../config/logger");

const QR_SECRET = process.env.QR_SECRET || "teetime-draft-secret-key-change-in-production";
const QR_VERSION = 1;

class DraftService {
  /**
   * Generate or get existing QR code for user
   */
  async getOrCreateQRCode(userId) {
    // Check for existing active code
    const existing = await pool.query(
      `SELECT * FROM draft_qr_codes WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (existing.rows.length > 0) {
      // Return existing code info (we need to regenerate the payload since we don't store the code)
      return this.generateQRPayload(userId, existing.rows[0].version);
    }

    // Generate new code
    return this.generateNewQRCode(userId);
  }

  /**
   * Generate a new QR code (for first time or regeneration)
   */
  async generateNewQRCode(userId) {
    const code = crypto.randomBytes(16).toString("hex");
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    // Get next version
    const versionResult = await pool.query(
      `SELECT COALESCE(MAX(version), 0) + 1 as next_version 
       FROM draft_qr_codes WHERE user_id = $1`,
      [userId]
    );
    const version = versionResult.rows[0].next_version;

    // Insert new code
    await pool.query(
      `INSERT INTO draft_qr_codes (user_id, code_hash, version, is_active)
       VALUES ($1, $2, $3, true)`,
      [userId, codeHash, version]
    );

    logger.info(`Generated new QR code for user ${userId}, version ${version}`);

    return this.createPayload(userId, code, version);
  }

  /**
   * Regenerate QR code (invalidates all previous codes)
   */
  async regenerateQRCode(userId) {
    // Revoke all existing codes
    await pool.query(
      `UPDATE draft_qr_codes 
       SET is_active = false, revoked_at = NOW()
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    logger.info(`Revoked all QR codes for user ${userId}`);

    // Generate new code
    return this.generateNewQRCode(userId);
  }

  /**
   * Create the QR payload object
   */
  createPayload(userId, code, version) {
    const payload = { v: QR_VERSION, u: userId, c: code };
    const sig = crypto
      .createHmac("sha256", QR_SECRET)
      .update(JSON.stringify(payload))
      .digest("hex")
      .substring(0, 16); // Shortened signature

    return {
      ...payload,
      s: sig,
    };
  }

  /**
   * Generate payload for existing code (when we need to show QR again)
   * Note: This regenerates the code since we don't store it
   */
  async generateQRPayload(userId, version) {
    // Since we only store the hash, we need to regenerate
    // This is a security feature - the actual code is never stored
    return this.regenerateQRCode(userId);
  }

  /**
   * Validate a scanned QR code
   */
  async validateQRCode(qrData, scannerId) {
    try {
      // Decode payload
      const payload = JSON.parse(Buffer.from(qrData, "base64").toString());
      const { v: version, u: userId, c: code, s: sig } = payload;

      // Validate version
      if (version !== QR_VERSION) {
        return { valid: false, error: "Outdated QR code version" };
      }

      // Validate signature
      const expectedPayload = { v: version, u: userId, c: code };
      const expectedSig = crypto
        .createHmac("sha256", QR_SECRET)
        .update(JSON.stringify(expectedPayload))
        .digest("hex")
        .substring(0, 16);

      if (sig !== expectedSig) {
        return { valid: false, error: "Invalid QR code" };
      }

      // Prevent self-scan
      if (userId === scannerId) {
        return { valid: false, error: "Cannot add yourself to your roster" };
      }

      // Verify code exists and is active
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      const qrRecord = await pool.query(
        `SELECT * FROM draft_qr_codes 
         WHERE code_hash = $1 AND is_active = true AND user_id = $2`,
        [codeHash, userId]
      );

      if (qrRecord.rows.length === 0) {
        return { valid: false, error: "QR code is invalid or has been revoked" };
      }

      // Check expiration
      const record = qrRecord.rows[0];
      if (record.expires_at && new Date(record.expires_at) < new Date()) {
        return { valid: false, error: "QR code has expired" };
      }

      // Update scan count
      await pool.query(
        `UPDATE draft_qr_codes 
         SET scanned_count = scanned_count + 1, last_scanned_at = NOW()
         WHERE id = $1`,
        [record.id]
      );

      // Record scan history
      await pool.query(
        `INSERT INTO qr_scan_history (qr_code_id, scanned_user_id, scanner_user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [record.id, userId, scannerId]
      );

      return { valid: true, userId, qrRecordId: record.id };
    } catch (error) {
      logger.error("QR validation error:", error);
      return { valid: false, error: "Invalid QR code format" };
    }
  }

  /**
   * Get mutual clubs between two users
   */
  async getMutualClubs(userId1, userId2) {
    const result = await pool.query(
      `SELECT c.name 
       FROM user_club_memberships ucm1
       JOIN user_club_memberships ucm2 ON ucm1.club_id = ucm2.club_id
       JOIN clubs c ON ucm1.club_id = c.id
       WHERE ucm1.user_id = $1 AND ucm2.user_id = $2`,
      [userId1, userId2]
    );
    return result.rows.map((r) => r.name);
  }

  /**
   * Encode payload for QR code
   */
  encodePayload(payload) {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }
}

module.exports = new DraftService();
