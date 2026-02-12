const express = require("express");
const { query } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");
const searchController = require("../controllers/searchController");

const router = express.Router();

/**
 * @route   GET /api/search
 * @desc    Global search (users, tee times, groups, courses) - Figma 795-6009, 791-*
 * @query   q - search string (min 2 chars)
 */
router.get(
  "/",
  authenticate,
  [
    query("q")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Query must be at least 2 characters"),
  ],
  validateRequest,
  searchController.getSearch,
);

module.exports = router;
