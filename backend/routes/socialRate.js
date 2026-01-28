const express = require("express");
const router = express.Router();
const socialRateController = require("../controllers/socialRateController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/social-rate
 * @desc    Get current user's social rate score and summary
 * @access  Private
 */
router.get("/", socialRateController.getCurrentScore);

/**
 * @route   GET /api/social-rate/history
 * @desc    Get user's score change history
 * @access  Private
 * @query   limit (default: 50), offset (default: 0)
 */
router.get("/history", socialRateController.getHistory);

/**
 * @route   GET /api/social-rate/user/:userId
 * @desc    Get another user's public social rate score
 * @access  Private
 */
router.get("/user/:userId", socialRateController.getUserScore);

module.exports = router;
