const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { authenticate, optionalAuth } = require("../middleware/auth");

// Club search from CSV database (fast, local)
router.get("/clubs/search", courseController.searchClubs);
router.get("/clubs/stats", courseController.getClubStats);

// City search for locations
router.get("/cities/search", courseController.searchCities);
router.get("/cities/popular", courseController.getPopularCities);

// Public routes (optional auth for personalization)
router.get("/search", optionalAuth, courseController.searchCourses);
router.get("/nearby", optionalAuth, courseController.getNearbyCourses);
router.get("/popular", optionalAuth, courseController.getPopularCourses);

// Protected routes - must be before /:id to avoid conflicts
router.get("/favorites", authenticate, courseController.getFavorites);
router.post("/favorites", authenticate, courseController.addFavorite);
router.delete("/favorites/:id", authenticate, courseController.removeFavorite);

// Dynamic route - must be last
router.get("/:id", optionalAuth, courseController.getCourse);

module.exports = router;
