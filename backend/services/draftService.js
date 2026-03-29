const crypto = require("crypto");
const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");

const QR_SECRET = process.env.QR_SECRET || "teetime-draft-secret-key-change-in-production";
const QR_VERSION = 1;

/**
 * Scanners / share sheets often add whitespace, newlines, or BOM; base64 may lack padding.
 */
function normalizeDraftQrRawInput(raw) {
  if (raw == null) return "";
  let s = String(raw).trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s.replace(/\s+/g, "");
}

/**
 * Decode TeeTime draft QR: standard base64 JSON payload { v, u, c, s }.
 */
function parseDraftQrPayload(qrData) {
  const compact = normalizeDraftQrRawInput(qrData);
  if (!compact) {
    throw new Error("empty");
  }

  const candidates = new Set();
  candidates.add(compact);
  candidates.add(compact.replace(/-/g, "+").replace(/_/g, "/"));

  const toTry = new Set();
  for (const c of candidates) {
    toTry.add(c);
    const rem = c.length % 4;
    if (rem) {
      toTry.add(c + "=".repeat(4 - rem));
    }
  }

  for (const candidate of toTry) {
    try {
      const json = Buffer.from(candidate, "base64").toString("utf8");
      const payload = JSON.parse(json);
      if (
        payload &&
        typeof payload === "object" &&
        "v" in payload &&
        "u" in payload &&
        "c" in payload &&
        "s" in payload
      ) {
        return payload;
      }
    } catch {
      /* try next */
    }
  }
  throw new Error("parse");
}

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
      const row = existing[0];
      if (row.code_secret) {
        return this.createPayload(userId, row.code_secret, row.version);
      }
      // Legacy rows: no stored secret — rotate once so the client gets a stable QR going forward
      logger.warn(
        `draft_qr_codes active row for user ${userId} missing code_secret; rotating`
      );
      return this.regenerateQRCode(userId);
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
        code_secret: code,
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
    const uid = String(userId).toLowerCase();
    const c = String(code).toLowerCase();
    const payload = { v: QR_VERSION, u: uid, c };
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
   * Validate a scanned QR code
   */
  async validateQRCode(qrData, scannerId) {
    try {
      const payload = parseDraftQrPayload(qrData);
      const version = Number(payload.v);
      const rawU = String(payload.u);
      const rawC = String(payload.c);
      const sig = String(payload.s).toLowerCase();

      // Validate version
      if (version !== QR_VERSION) {
        return { valid: false, error: "Outdated QR code version" };
      }

      // Try normalized + legacy HMAC shapes (older QRs may have mixed-case UUID in JSON)
      const signVariants = [
        { u: rawU.toLowerCase(), c: rawC.toLowerCase() },
        { u: rawU, c: rawC },
        { u: rawU.toLowerCase(), c: rawC },
        { u: rawU, c: rawC.toLowerCase() },
      ];
      const seen = new Set();
      let userId = rawU.toLowerCase();
      let code = rawC.toLowerCase();
      let signatureOk = false;
      for (const { u, c } of signVariants) {
        const key = `${u}\0${c}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const expectedSig = crypto
          .createHmac("sha256", QR_SECRET)
          .update(JSON.stringify({ v: version, u, c }))
          .digest("hex")
          .substring(0, 16);
        if (sig === expectedSig) {
          userId = u.toLowerCase();
          code = c.toLowerCase();
          signatureOk = true;
          break;
        }
      }

      if (!signatureOk) {
        return { valid: false, error: "Invalid QR code" };
      }

      const scannerNorm = String(scannerId).toLowerCase();

      if (userId === scannerNorm) {
        return { valid: false, error: "Cannot add yourself to your roster" };
      }

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
      logger.debug("QR validation parse/decode failed:", error.message);
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
