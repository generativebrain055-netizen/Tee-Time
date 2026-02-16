const { Router } = require("express");
const { body } = require("express-validator");
const { validateRequest } = require("../middleware/validator");
const { authenticateAdmin } = require("../middleware/adminAuth");
const adminController = require("../controllers/admin/adminController");

const router = Router();

/**
 * @route   POST /api/admin/login
 * @desc    Super admin login (email + password from env)
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
 * @route   GET /api/admin/dashboard/stats
 * @desc    Dashboard metrics: total users, active users, tee times booked
 * @access  Super admin only
 */
router.get(
  "/dashboard/stats",
  authenticateAdmin,
  adminController.getDashboardStats
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
