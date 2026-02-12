const { Router } = require("express");
const { body, query } = require("express-validator");
const rosterController = require("../controllers/rosterController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ STATIC ROUTES FIRST ============

/**
 * @route   GET /api/roster
 * @desc    Get user's roster with pagination
 * @access  Private
 */
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
  rosterController.getRoster,
);

/**
 * @route   POST /api/roster
 * @desc    Add contact to roster
 * @access  Private
 */
router.post(
  "/",
  [
    body("contactUserId").optional().isUUID().withMessage("Invalid user ID"),
    body("contactPhone")
      .optional()
      .trim()
      .matches(/^\+?[1-9]\d{6,14}$/)
      .withMessage("Invalid phone number"),
    body("contactName")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Name too long"),
    body("contactEmail")
      .optional()
      .trim()
      .isEmail()
      .withMessage("Invalid email"),
  ],
  validateRequest,
  rosterController.addToRoster,
);

/**
 * @route   GET /api/roster/on-deck
 * @desc    Get on-deck players
 * @access  Private
 */
router.get("/on-deck", rosterController.getOnDeck);

/**
 * @route   GET /api/roster/search
 * @desc    Search users to add to roster
 * @access  Private
 */
router.get(
  "/search",
  [
    query("q")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Search query must be at least 2 characters"),
  ],
  validateRequest,
  rosterController.searchUsers,
);

/**
 * @route   PUT /api/roster/reorder
 * @desc    Reorder roster (drag & drop)
 * @access  Private
 */
router.put(
  "/reorder",
  [
    body("orderedIds")
      .isArray({ min: 1, max: 100 })
      .withMessage("orderedIds must be an array with 1-100 items"),
    body("orderedIds.*")
      .isUUID()
      .withMessage("Each orderedIds item must be a valid UUID"),
  ],
  validateRequest,
  rosterController.reorderRoster,
);

// ============ ROSTER GROUPS (before :id routes) ============

/**
 * @route   GET /api/roster/groups
 * @desc    Get all roster groups
 * @access  Private
 */
router.get("/groups", rosterController.getGroups);

/**
 * @route   GET /api/roster/groups/:id
 * @desc    Get a single roster group by ID
 * @access  Private
 */
router.get("/groups/:id", rosterController.getGroup);

/**
 * @route   POST /api/roster/groups
 * @desc    Create a new roster group
 * @access  Private
 */
router.post("/groups", rosterController.createGroup);

/**
 * @route   PUT /api/roster/groups/:id
 * @desc    Update a roster group
 * @access  Private
 */
router.put("/groups/:id", rosterController.updateGroup);

/**
 * @route   PUT /api/roster/groups/:id/sort
 * @desc    Update group sort preference
 * @access  Private
 */
router.put("/groups/:id/sort", rosterController.updateGroupSort);

/**
 * @route   GET /api/roster/groups/:id/auto-invite
 * @desc    Get auto-invite members for tee time creation
 * @access  Private
 */
router.get("/groups/:id/auto-invite", rosterController.getAutoInviteMembers);

/**
 * @route   DELETE /api/roster/groups/:id
 * @desc    Delete a roster group
 * @access  Private
 */
router.delete("/groups/:id", rosterController.deleteGroup);

/**
 * @route   GET /api/roster/groups/:id/members
 * @desc    Get members of a specific group
 * @access  Private
 */
router.get("/groups/:id/members", rosterController.getGroupMembers);

/**
 * @route   POST /api/roster/groups/:id/members
 * @desc    Add members to a group (Figma 1075-927: Inviting people)
 * @access  Private
 */
router.post(
  "/groups/:id/members",
  [
    body("memberUserIds")
      .isArray({ min: 1 })
      .withMessage("memberUserIds must be a non-empty array"),
    body("memberUserIds.*")
      .isUUID()
      .withMessage("Each memberUserIds item must be a valid UUID"),
  ],
  validateRequest,
  rosterController.addMembersToGroup,
);

/**
 * @route   POST /api/roster/groups/:id/leave
 * @desc    Leave a group (remove current user from group) (Figma 1075-927: removing yourself)
 * @access  Private
 */
router.post("/groups/:id/leave", rosterController.leaveGroup);

// ============ WAIVER WIRE (before :id routes) ============

/**
 * @route   GET /api/roster/waiver-wire
 * @desc    Get waiver wire entries for a date
 * @access  Private
 */
router.get("/waiver-wire", rosterController.getWaiverWire);

/**
 * @route   POST /api/roster/waiver-wire
 * @desc    Add yourself to waiver wire
 * @access  Private
 */
router.post("/waiver-wire", rosterController.addToWaiverWire);

/**
 * @route   DELETE /api/roster/waiver-wire/:date
 * @desc    Remove from waiver wire
 * @access  Private
 */
router.delete("/waiver-wire/:date", rosterController.removeFromWaiverWire);

// ============ DYNAMIC :id ROUTES LAST ============

/**
 * @route   DELETE /api/roster/:id
 * @desc    Remove from roster
 * @access  Private
 */
router.delete("/:id", rosterController.removeFromRoster);

/**
 * @route   PUT /api/roster/:id/on-deck
 * @desc    Toggle on-deck status
 * @access  Private
 */
router.put(
  "/:id/on-deck",
  [body("isOnDeck").isBoolean().withMessage("isOnDeck must be a boolean")],
  validateRequest,
  rosterController.toggleOnDeck,
);

/**
 * @route   PUT /api/roster/:id/group
 * @desc    Update member's group
 * @access  Private
 */
router.put("/:id/group", rosterController.updateMemberGroup);

/**
 * @route   PUT /api/roster/:id/move
 * @desc    Move member (drag & drop between sections)
 * @access  Private
 */
router.put("/:id/move", rosterController.moveMember);

/**
 * @route   GET /api/roster/:id/profile
 * @desc    Get detailed member profile
 * @access  Private
 */
router.get("/:id/profile", rosterController.getMemberProfile);

/**
 * @route   GET /api/roster/:id/history
 * @desc    Get member's playing history
 * @access  Private
 */
router.get("/:id/history", rosterController.getMemberHistory);

module.exports = router;
