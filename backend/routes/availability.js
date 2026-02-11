const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const { authenticate } = require('../middleware/auth');

/**
 * Availability Routes
 * All routes require authentication
 */

// Get current user's availability
router.get('/', authenticate, availabilityController.getUserAvailability);

// Save/update current user's availability
router.post('/', authenticate, availabilityController.saveAvailability);

// Clear current user's availability
router.delete('/', authenticate, availabilityController.clearAvailability);

// Get availability for multiple users (for matching)
router.post('/users', authenticate, availabilityController.getMultipleUsersAvailability);

module.exports = router;
