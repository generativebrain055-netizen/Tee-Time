const socialRateService = require("../services/socialRateService");
const logger = require("../config/logger");
const { formatSocialRateHistoryEntries } = require("../utils/socialRateHistoryFormatter");

class SocialRateController {
  constructor() {
    this.getCurrentScore = this.getCurrentScore.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getUserScore = this.getUserScore.bind(this);
  }

  /**
   * GET /api/social-rate
   * Get current user's social rate score and summary
   */
  async getCurrentScore(req, res) {
    try {
      const userId = req.user.id;
      const summary = await socialRateService.getSummary(userId);

      res.json({
        success: true,
        socialRate: {
          currentScore: summary.current_score,
          stats: {
            totalAccepts: parseInt(summary.total_accepts),
            totalLateDeclines: parseInt(summary.total_late_declines),
            totalLateCancellations: parseInt(summary.total_late_cancellations),
            totalNoShows: parseInt(summary.total_no_shows),
            totalEarned: parseInt(summary.total_earned),
            totalLost: parseInt(summary.total_lost)
          }
        }
      });
    } catch (error) {
      logger.error("Get social rate error:", error);
      res.status(500).json({ success: false, message: "Failed to get social rate" });
    }
  }

  /**
   * GET /api/social-rate/history
   * Get user's score change history
   */
  async getHistory(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const history = await socialRateService.getScoreHistory(userId, limit, offset);
      const formatted = formatSocialRateHistoryEntries(history);

      res.json({ success: true, history: formatted });
    } catch (error) {
      logger.error("Get social rate history error:", error);
      res.status(500).json({ success: false, message: "Failed to get history" });
    }
  }

  /**
   * GET /api/social-rate/user/:userId
   * Get another user's public social rate score
   */
  async getUserScore(req, res) {
    try {
      const targetUserId = req.params.userId;
      const score = await socialRateService.getCurrentScore(targetUserId);

      if (score === null) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.json({
        success: true,
        socialRate: {
          userId: targetUserId,
          currentScore: score
        }
      });
    } catch (error) {
      logger.error("Get user social rate error:", error);
      res.status(500).json({ success: false, message: "Failed to get user score" });
    }
  }
}

module.exports = new SocialRateController();
