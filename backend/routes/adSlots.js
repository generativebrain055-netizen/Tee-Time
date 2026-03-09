const express = require("express");
const adSlotController = require("../controllers/adSlotController");

const router = express.Router();

/**
 * @route   GET /api/ad-slots
 * @desc    Active ad slots for app (loading screen + banners). No auth.
 */
router.get("/", adSlotController.getActiveSlots);

module.exports = router;
