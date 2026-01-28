const crypto = require("crypto");
const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");

const QR_SECRET = process.env.QR_SECRET || "teetime-draft-secret-key-change-in-production";
const QR_VERSION = 1;

class DraftService {
  /**
   * Generate or get existing QR code for user
   */
  async getOrCreateQRCode(userId) {
    // Check for existing active code
    const { data: existing, error } = await supabaseAdmin
      .from("draft_qr_codes")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1);

    if (error) {
      logger.error(`Error checking existing QR code for user ${userId}:`, error.message);
      throw error;
    }

    if (existing && existing.length > 0) {
      // Return existing code info (regenerate payload since we don't store the code)
      return this.generateQRPayload(userId, existing[0].version);
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
    const { data: versionData, error: versionError } = await supabaseAdmin
      .from("draft_qr_codes")
      .select("version")
      .eq("user_id", userId)
      .order("version", { ascending: false })
      .limit(1);

    if (versionError) {
      logger.error(`Error getting QR version for user ${userId}:`, versionError.message);
      throw versionError;
    }

    const version = (versionData && versionData.length > 0) ? versionData[0].version + 1 : 1;

    // Insert new code
    const { error: insertError } = await supabaseAdmin
      .from("draft_qr_codes")
      .insert({
        user_id: userId,
        code_hash: codeHash,
        version: version,
        is_active: true
      });

    if (insertError) {
      logger.error(`Error inserting QR code for user ${userId}:`, insertError.message);
      throw insertError;
    }

    logger.info(`Generated new QR code for user ${userId}, version ${version}`);

    return this.createPayload(userId, code, version);
  }

  /**
   * Regenerate QR code (invalidates all previous codes)
   */
  async regenerateQRCode(userId) {
    // Revoke all existing codes
    const { error } = await supabaseAdmin
      .from("draft_qr_codes")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      logger.error(`Error revoking QR codes for user ${userId}:`, error.message);
      throw error;
    }

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
      .substring(0, 16);

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
      const { data: qrRecord, error } = await supabaseAdmin
        .from("draft_qr_codes")
        .select("*")
        .eq("code_hash", codeHash)
        .eq("is_active", true)
        .eq("user_id", userId)
        .limit(1);

      if (error || !qrRecord || qrRecord.length === 0) {
        return { valid: false, error: "QR code is invalid or has been revoked" };
      }

      const record = qrRecord[0];

      // Check expiration
      if (record.expires_at && new Date(record.expires_at) < new Date()) {
        return { valid: false, error: "QR code has expired" };
      }

      // Update scan count
      const { error: updateError } = await supabaseAdmin
        .from("draft_qr_codes")
        .update({
          scanned_count: record.scanned_count + 1,
          last_scanned_at: new Date().toISOString()
        })
        .eq("id", record.id);

      if (updateError) {
        logger.error("Error updating scan count:", updateError.message);
      }

      // Record scan history
      const { error: historyError } = await supabaseAdmin
        .from("qr_scan_history")
        .insert({
          qr_code_id: record.id,
          scanned_user_id: userId,
          scanner_user_id: scannerId
        });

      if (historyError && historyError.code !== '23505') { // Ignore duplicate key errors
        logger.error("Error recording scan history:", historyError.message);
      }

      return { valid: true, userId, qrRecordId: record.id };
    } catch (error) {
      logger.error("QR validation error:", error.message);
      return { valid: false, error: "Invalid QR code format" };
    }
  }

  /**
   * Get mutual clubs between two users
   */
  async getMutualClubs(userId1, userId2) {
    const { data, error } = await supabaseAdmin
      .from("user_club_memberships")
      .select(`
        clubs!inner (name)
      `)
      .eq("user_id", userId1);

    if (error) {
      logger.error("Error fetching mutual clubs:", error.message);
      return [];
    }

    // Get user2's clubs
    const { data: user2Clubs, error: error2 } = await supabaseAdmin
      .from("user_club_memberships")
      .select(`
        clubs!inner (name)
      `)
      .eq("user_id", userId2);

    if (error2) {
      logger.error("Error fetching user2 clubs:", error2.message);
      return [];
    }

    // Find mutual clubs
    const user1ClubNames = data.map(m => m.clubs.name);
    const user2ClubNames = user2Clubs.map(m => m.clubs.name);
    const mutualClubs = user1ClubNames.filter(name => user2ClubNames.includes(name));

    return mutualClubs;
  }

  /**
   * Encode payload for QR code
   */
  encodePayload(payload) {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }
}

module.exports = new DraftService();
