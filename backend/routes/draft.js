const { Router } = require("express");
const { body } = require("express-validator");
const draftController = require("../controllers/draftController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/draft/qr
 * @desc    Get or generate user's QR code for "Get Drafted"
 * @access  Private
 */
router.get("/qr", draftController.getQRCode);

/**
 * @route   POST /api/draft/qr/regenerate
 * @desc    Regenerate QR code (invalidates previous codes)
 * @access  Private
 */
router.post("/qr/regenerate", draftController.regenerateQRCode);

/**
 * @route   GET /api/draft/history
 * @desc    Get scan history - who scanned your QR code
 * @access  Private
 */
router.get("/history", draftController.getScanHistory);

/**
 * @route   POST /api/draft/scan
 * @desc    Scan and validate a QR code
 * @access  Private
 */
router.post(
  "/scan",
  [body("qrData").notEmpty().withMessage("QR data is required")],
  validateRequest,
  draftController.scanQRCode
);

/**
 * @route   POST /api/draft/confirm
 * @desc    Confirm adding scanned user to On-Deck
 * @access  Private
 */
router.post(
  "/confirm",
  [body("userId").isUUID().withMessage("Valid user ID is required")],
  validateRequest,
  draftController.confirmDraft
);

module.exports = router;
