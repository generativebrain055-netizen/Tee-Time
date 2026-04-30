const draftService = require("../services/draftService");
const rosterRepository = require("../repositories/rosterRepository");
const rosterService = require("../services/rosterService");
const friendRepository = require("../repositories/friendRepository");
const userRepository = require("../repositories/userRepository");
const { supabaseAdmin } = require("../config/supabase");
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
      logger.error("Get QR code error:", error.message);
      res
        .status(500)
        .json({ success: false, message: "Failed to generate QR code" });
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
      logger.error("Regenerate QR code error:", error.message);
      res
        .status(500)
        .json({ success: false, message: "Failed to regenerate QR code" });
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
        return res
          .status(400)
          .json({ success: false, message: "QR data is required" });
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

      // Get user profile for confirmation
      const userProfile = await userRepository.getPublicProfile(targetUserId);
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const displayName =
        `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() ||
        "This player";

      const [rosterRows, isFriend, blockRel] = await Promise.all([
        rosterRepository.getContactRosterRows(scannerId, targetUserId),
        friendRepository.areFriends(scannerId, targetUserId),
        friendRepository.getDirectBlockRelation(scannerId, targetUserId),
      ]);

      const anyMain = (rosterRows || []).some((r) => !r.is_on_deck);
      const anyOnDeck = (rosterRows || []).some((r) => r.is_on_deck);
      const hasRosterRow = (rosterRows || []).length > 0;

      const iBlocked = !!blockRel?.i_blocked;
      const theyBlocked = !!blockRel?.they_blocked_me;

      const statusDetailLines = [];
      if (iBlocked) {
        statusDetailLines.push(
          `You have blocked ${displayName}. Unblock them to add them via Scan to Draft.`
        );
      }
      if (theyBlocked) {
        statusDetailLines.push(`${displayName} has blocked you.`);
      }
      if (isFriend) {
        statusDetailLines.push(`${displayName} is your friend.`);
      }
      if (anyMain) {
        statusDetailLines.push(`${displayName} is on your roster.`);
      }
      if (anyOnDeck) {
        statusDetailLines.push(`${displayName} is on your On-Deck list.`);
      }

      const canAddToOnDeck =
        !hasRosterRow && !iBlocked && !theyBlocked;

      // Get mutual clubs
      const mutualClubs = await draftService.getMutualClubs(
        scannerId,
        targetUserId
      );

      res.json({
        success: true,
        user: {
          id: targetUserId,
          name: displayName,
          avatar: userProfile.avatar_url,
          socialRate: userProfile.social_rate,
          handicap: userProfile.handicap,
          homeCourse: userProfile.home_course,
          location: userProfile.location,
          // Account signup on users table (not profile row timestamps)
          createdAt: userProfile.created_at,
        },
        mutualClubs,
        confirmationRequired: true,
        canAddToOnDeck,
        statusDetailLines,
      });
    } catch (error) {
      logger.error("Scan QR code error:", error.message);
      res
        .status(500)
        .json({ success: false, message: "Failed to process QR code" });
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
        return res
          .status(400)
          .json({ success: false, message: "User ID is required" });
      }

      const blockRel = await friendRepository.getDirectBlockRelation(
        scannerId,
        userId
      );
      if (blockRel?.i_blocked || blockRel?.they_blocked_me) {
        return res.status(400).json({
          success: false,
          message: "You cannot add this player while one of you has blocked the other.",
          code: "BLOCKED",
        });
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

      // Set as on-deck (service sends availability notification)
      await rosterService.toggleOnDeck(scannerId, entry.id, true);

      // Fetch scanner details
      const scanner = await userRepository.findById(scannerId);

      // Fetch target user details
      const targetUser = await userRepository.findById(userId);

      // ========================================
      // STEP 1: Create BIDIRECTIONAL FRIENDSHIP
      // ========================================
      const alreadyFriends = await friendRepository.areFriends(
        scannerId,
        userId
      );
      if (!alreadyFriends) {
        try {
          // Insert bidirectional friendships (both directions)
          const { error: friendshipError } = await supabaseAdmin
            .from("friendships")
            .insert([
              { user_id: scannerId, friend_id: userId },
              { user_id: userId, friend_id: scannerId },
            ]);

          if (friendshipError && friendshipError.code !== "23505") {
            // 23505 = unique_violation, ignore if already exists
            logger.error(
              "Failed to create friendship:",
              friendshipError.message
            );
          } else {
            logger.info(
              `Created bidirectional friendship between ${scannerId} and ${userId}`
            );
          }
        } catch (err) {
          logger.error("Failed to create friendship:", err.message);
        }
      }

      // ========================================
      // STEP 2: Add target user to SCANNER'S roster (On-Deck)
      // ========================================
      // Already done above - entry is created

      // ========================================
      // STEP 3: Add scanner to TARGET USER'S roster (mutual)
      // ========================================
      const reverseExists = await rosterRepository.isInRoster(
        userId,
        scannerId
      );
      if (!reverseExists) {
        try {
          const reverseEntry = await rosterRepository.addToRoster(userId, {
            contactUserId: scannerId,
            contactName: `${scanner.first_name || ""} ${
              scanner.last_name || ""
            }`.trim(),
            contactPhone: scanner.phone_number,
            contactEmail: scanner.email,
          });
          // Also set reverse entry as On-Deck so both see each other
          if (reverseEntry) {
            await rosterService.toggleOnDeck(userId, reverseEntry.id, true);
          }
          logger.info(
            `Automatically created mutual roster entry for user ${userId} -> ${scannerId}`
          );
        } catch (err) {
          // Log but don't fail the request if auto-add fails
          logger.error("Failed to create mutual roster entry:", err.message);
        }
      }

      // Intentionally no roster-add notification to the drafted user (same as manual roster add).

      // Get the added user's name for response
      const addedUser = await userRepository.getPublicProfile(userId);

      // Update scan history to mark as added to roster
      const { error } = await supabaseAdmin
        .from("qr_scan_history")
        .update({ was_added_to_roster: true })
        .eq("scanner_user_id", scannerId)
        .eq("scanned_user_id", userId)
        .gte("scanned_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

      if (error) {
        logger.error("Error updating scan history:", error.message);
      }

      res.json({
        success: true,
        message: `${
          addedUser?.first_name || "User"
        } added to your On-Deck list`,
        entry: {
          id: entry.id,
          userId: userId,
          isOnDeck: true,
        },
      });
    } catch (error) {
      logger.error("Confirm draft error:", error.message);
      res
        .status(500)
        .json({ success: false, message: "Failed to add user to roster" });
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

      const { data, error } = await supabaseAdmin
        .from("qr_scan_history")
        .select(
          `
          id,
          scanner_user_id,
          was_added_to_roster,
          scanned_at,
          users!qr_scan_history_scanner_user_id_fkey (
            first_name,
            last_name
          ),
          user_profiles!qr_scan_history_scanner_user_id_fkey (
            avatar_url,
            handicap
          )
        `
        )
        .eq("scanned_user_id", userId)
        .order("scanned_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error("Get scan history error:", error.message);
        return res
          .status(500)
          .json({ success: false, message: "Failed to get scan history" });
      }

      const history = (data || []).map((row) => ({
        id: row.id,
        scannerId: row.scanner_user_id,
        scannerName:
          `${row.users?.first_name || ""} ${
            row.users?.last_name || ""
          }`.trim() || "Unknown",
        scannerAvatar: row.user_profiles?.avatar_url,
        scannerHandicap: row.user_profiles?.handicap,
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
      logger.error("Get scan history error:", error.message);
      res
        .status(500)
        .json({ success: false, message: "Failed to get scan history" });
    }
  }
}

module.exports = new DraftController();
