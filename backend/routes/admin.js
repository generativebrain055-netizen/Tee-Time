const { Router } = require("express");
const { body } = require("express-validator");
const { validateRequest } = require("../middleware/validator");
const { authenticateAdmin } = require("../middleware/adminAuth");
const adminController = require("../controllers/admin/adminController");

const router = Router();

/**
 * @route   POST /api/admin/login
 * @desc    Super admin login (email + password from env). If MFA enabled, returns temporaryToken for /mfa/verify.
 * @access  Public
 */
router.post(
  "/login",
  [
    body("email").trim().notEmpty().withMessage("Email is required"),
    body("password").trim().notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  adminController.login
);

/**
 * @route   POST /api/admin/mfa/verify
 * @desc    Verify MFA code and exchange temporaryToken for accessToken
 * @body    { temporaryToken, code } - code = 6-digit TOTP from authenticator app
 * @access  Public
 */
router.post(
  "/mfa/verify",
  [
    body("temporaryToken").trim().notEmpty().withMessage("Temporary token is required"),
    body("code").trim().notEmpty().withMessage("Code is required").isLength({ min: 6, max: 6 }).withMessage("Code must be 6 digits").isNumeric().withMessage("Code must be numeric"),
  ],
  validateRequest,
  adminController.mfaVerify
);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Dashboard metrics: total users, active users, tee times booked
 * @access  Super admin only
 */
router.get(
  "/dashboard/stats",
  authenticateAdmin,
  adminController.getDashboardStats
);

/**
 * @route   GET /api/admin/courses/usage
 * @desc    Most frequently used courses by tee time count (platform usage)
 * @query   limit (default 50, max 200)
 * @access  Super admin only
 */
router.get(
  "/courses/usage",
  authenticateAdmin,
  adminController.getCourseUsage
);

// ---------- User management (admin only) ----------
router.get("/users", authenticateAdmin, adminController.searchUsers);
router.get("/users/:id", authenticateAdmin, adminController.getUserProfile);
router.put("/users/:id", authenticateAdmin, adminController.updateUser);
router.post("/users/:id/suspend", authenticateAdmin, adminController.suspendUser);
router.post("/users/:id/unsuspend", authenticateAdmin, adminController.unsuspendUser);
router.post("/users/:id/ban", authenticateAdmin, adminController.banUser);

// ---------- User-reported issues ----------
router.get("/reports", authenticateAdmin, adminController.listReports);
router.patch("/reports/:id", authenticateAdmin, adminController.updateReport);

// ---------- System settings (read-only status) ----------
router.get("/settings", authenticateAdmin, adminController.getSystemSettings);

// ---------- Ad slots (loading screen + 3 banner placements) ----------
router.get("/ad-slots", authenticateAdmin, adminController.listAdSlots);
router.put("/ad-slots/:slotKey", authenticateAdmin, adminController.updateAdSlot);
router.post("/ad-slots/:slotKey/asset", authenticateAdmin, adminController.uploadAdSlotAsset);
router.delete("/ad-slots/:slotKey/asset", authenticateAdmin, adminController.removeAdSlotAsset);

// ---------- Golf courses (database: golf_courses table) ----------
router.get("/courses", authenticateAdmin, adminController.listCourses);
router.get("/courses/:id", authenticateAdmin, adminController.getCourse);
router.post(
  "/courses",
  authenticateAdmin,
  [body("name").trim().notEmpty().withMessage("Name is required")],
  validateRequest,
  adminController.createCourse
);
router.put("/courses/:id", authenticateAdmin, adminController.updateCourse);
router.delete("/courses/:id", authenticateAdmin, adminController.deleteCourse);

// ---------- Broadcast push notifications ----------
router.post(
  "/notifications/broadcast/preview",
  authenticateAdmin,
  [body("title").optional(), body("body").optional()],
  adminController.previewBroadcast
);
router.post(
  "/notifications/broadcast/send",
  authenticateAdmin,
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("body").trim().notEmpty().withMessage("Body is required"),
  ],
  validateRequest,
  adminController.sendBroadcast
);

module.exports = router;
