const logger = require("../config/logger");
const searchService = require("../services/searchService");

class SearchController {
  constructor() {
    this.getSearch = this.getSearch.bind(this);
  }

  /**
   * GET /api/search?q=...
   * Global search across users, tee times, groups, and courses (Figma 795-6009, 791-*)
   */
  async getSearch(req, res) {
    try {
      const q = (req.query.q || "").trim();
      if (q.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Search query must be at least 2 characters",
        });
      }

      const results = await searchService.searchAll(q, req.user.id);
      res.json({ success: true, ...results });
    } catch (error) {
      logger.error("Global search error:", error);
      res.status(500).json({
        success: false,
        message: "Search failed",
      });
    }
  }
}

module.exports = new SearchController();
