const express = require("express");
const { query, body } = require("express-validator");
const router = express.Router();
const friendController = require("../controllers/friendController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");

// All routes require authentication
router.use(authenticate);

// Friend requests
router.post("/request", friendController.sendFriendRequest);
// Invite via Link — send SMS to phone with app link (no tee time)
router.post(
    "/invite-by-phone",
    [body("phone").isString().notEmpty().trim().withMessage("Phone number is required")],
    validateRequest,
    friendController.inviteByPhone,
);
router.get("/requests/pending", friendController.getPendingRequests);
router.get("/requests/sent", friendController.getSentRequests);
router.put("/requests/:id/respond", friendController.respondToRequest);

// Friendships (with pagination)
router.get(
  "/",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be 1-100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("offset must be >= 0"),
  ],
  validateRequest,
  friendController.getFriends,
);
router.get(
  "/messaging-exclusions",
  friendController.getMessagingExcludedUserIds,
);
router.get(
  "/block-relation/:otherUserId",
  friendController.getBlockRelation,
);
router.delete("/:id", friendController.removeFriend);

// Discovery
router.get("/discover", friendController.discoverUsers);
router.get("/profile/:id", friendController.getUserProfile);

// Block/Unblock
router.post("/block/:id", friendController.blockUser);
router.delete("/block/:id", friendController.unblockUser);
router.get("/blocked", friendController.getBlockedUsers);

module.exports = router;
