const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friendController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// Friend requests
router.post("/request", friendController.sendFriendRequest);
router.get("/requests/pending", friendController.getPendingRequests);
router.get("/requests/sent", friendController.getSentRequests);
router.put("/requests/:id/respond", friendController.respondToRequest);

// Friendships
router.get("/", friendController.getFriends);
router.delete("/:id", friendController.removeFriend);

// Discovery
router.get("/discover", friendController.discoverUsers);
router.get("/profile/:id", friendController.getUserProfile);

// Block/Unblock
router.post("/block/:id", friendController.blockUser);
router.delete("/block/:id", friendController.unblockUser);
router.get("/blocked", friendController.getBlockedUsers);

module.exports = router;
