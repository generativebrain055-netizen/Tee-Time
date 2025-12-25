const draftService = require("../services/draftService");
const rosterRepository = require("../repositories/rosterRepository");
const userRepository = require("../repositories/userRepository");
const rosterNotificationService = require("../services/rosterNotificationService");
const { pool } = require("../config/database");
const logger = require("../config/logger");

class DraftController {
  constructor() {
    this.getQRCode = this.getQRCode.bind(this);
    this.regenerateQRCode = this.regenerateQRCode.bind(this);
    this.scanQRCode = this.scanQRCode.bind(this);
    this.confirmDraft = this.confirmDraft.bind(this);
    this.getScanHistory = this.getScanHistory.bind(this);
  }

  /**
   * GET /api/draft/qr
   * Get or generate user's QR code for "Get Drafted"
   */
  async getQRCode(req, res) {
    try {
      const userId = req.user.id;
      const payload = await draftService.getOrCreateQRCode(userId);
      const encoded = draftService.encodePayload(payload);

      res.json({
        success: true,
        qrCode: {
          data: encoded,
          version: payload.v,
        },
      });
    } catch (error) {
      logger.error("Get QR code error:", error);
      res.status(500).json({ success: false, message: "Failed to generate QR code" });
    }
  }

  /**
   * POST /api/draft/qr/regenerate
   * Regenerate QR code (invalidates old codes)
   */
  async regenerateQRCode(req, res) {
    try {
      const userId = req.user.id;
      const payload = await draftService.regenerateQRCode(userId);
      const encoded = draftService.encodePayload(payload);

      res.json({
        success: true,
        qrCode: {
          data: encoded,
          version: payload.v,
        },
        message: "QR code regenerated. Previous codes are now invalid.",
      });
    } catch (error) {
      logger.error("Regenerate QR code error:", error);
      res.status(500).json({ success: false, message: "Failed to regenerate QR code" });
    }
  }

  /**
   * POST /api/draft/scan
   * Scan and validate a QR code
   */
  async scanQRCode(req, res) {
    try {
      const scannerId = req.user.id;
      const { qrData } = req.body;

      if (!qrData) {
        return res.status(400).json({ success: false, message: "QR data is required" });
      }

      // Validate QR code
      const validation = await draftService.validateQRCode(qrData, scannerId);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
          code: "INVALID_QR",
        });
      }

      const targetUserId = validation.userId;

      // Check if already in roster
      const existing = await rosterRepository.isInRoster(scannerId, targetUserId);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "This user is already in your roster",
          code: "ALREADY_IN_ROSTER",
        });
      }

      // Get user profile for confirmation
      const userProfile = await userRepository.getPublicProfile(targetUserId);
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Get mutual clubs
      const mutualClubs = await draftService.getMutualClubs(scannerId, targetUserId);

      res.json({
        success: true,
        user: {
          id: targetUserId,
          name: `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || "Unknown",
          avatar: userProfile.avatar_url,
          socialRate: userProfile.social_rate,
          handicap: userProfile.handicap,
          homeCourse: userProfile.home_course,
          location: userProfile.location,
        },
        mutualClubs,
        confirmationRequired: true,
      });
    } catch (error) {
      logger.error("Scan QR code error:", error);
      res.status(500).json({ success: false, message: "Failed to process QR code" });
    }
  }

  /**
   * POST /api/draft/confirm
   * Confirm adding scanned user to On-Deck
   */
  async confirmDraft(req, res) {
    try {
      const scannerId = req.user.id;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required" });
      }

      // Double-check not already in roster
      const existing = await rosterRepository.isInRoster(scannerId, userId);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "This user is already in your roster",
          code: "ALREADY_IN_ROSTER",
        });
      }

      // Add to roster as On-Deck
      const entry = await rosterRepository.addToRoster(scannerId, {
        contactUserId: userId,
      });

      // Set as on-deck
      await rosterRepository.toggleOnDeck(scannerId, entry.id, true);

      // Send notification to drafted user
      const scanner = await userRepository.findById(scannerId);
      rosterNotificationService.sendRosterAddNotification(
        { ...entry, contact_user_id: userId },
        scanner
      ).catch((err) => logger.error("Failed to send draft notification:", err));

      // Get the added user's name for response
      const addedUser = await userRepository.getPublicProfile(userId);

      // Update scan history to mark as added to roster
      await pool.query(
        `UPDATE qr_scan_history 
         SET was_added_to_roster = true 
         WHERE scanner_user_id = $1 AND scanned_user_id = $2 
         AND scanned_at > NOW() - INTERVAL '10 minutes'`,
        [scannerId, userId]
      );

      res.json({
        success: true,
        message: `${addedUser?.first_name || "User"} added to your On-Deck list`,
        entry: {
          id: entry.id,
          userId: userId,
          isOnDeck: true,
        },
      });
    } catch (error) {
      logger.error("Confirm draft error:", error);
      res.status(500).json({ success: false, message: "Failed to add user to roster" });
    }
  }

  /**
   * GET /api/draft/history
   * Get scan history - who scanned your QR code
   */
  async getScanHistory(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const result = await pool.query(
        `SELECT 
           h.id,
           h.scanner_user_id,
           h.was_added_to_roster,
           h.scanned_at,
           u.first_name,
           u.last_name,
           p.avatar_url,
           p.handicap
         FROM qr_scan_history h
         JOIN users u ON h.scanner_user_id = u.id
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE h.scanned_user_id = $1
         ORDER BY h.scanned_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const history = result.rows.map(row => ({
        id: row.id,
        scannerId: row.scanner_user_id,
        scannerName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown',
        scannerAvatar: row.avatar_url,
        scannerHandicap: row.handicap,
        wasAddedToRoster: row.was_added_to_roster,
        scannedAt: row.scanned_at,
      }));

      res.json({
        success: true,
        history,
        pagination: {
          limit,
          offset,
          hasMore: history.length === limit,
        },
      });
    } catch (error) {
      logger.error("Get scan history error:", error);
      res.status(500).json({ success: false, message: "Failed to get scan history" });
    }
  }
}

module.exports = new DraftController();
