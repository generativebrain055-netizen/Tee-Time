const availabilityRepository = require('../repositories/availabilityRepository');
const onboardingService = require('../services/onboardingService');
const logger = require('../config/logger');

/**
 * Validate UUID format
 * @param {string} uuid 
 * @returns {boolean}
 */
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

/**
 * Sanitize string input (remove special characters, trim)
 * @param {string} str 
 * @returns {string}
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
};

/**
 * Availability Controller
 * Handles HTTP requests for user availability management
 * All inputs are validated and sanitized before processing
 */
class AvailabilityController {
    /**
     * Get current user's availability
     * GET /api/availability
     */
    async getUserAvailability(req, res) {
        try {
            const userId = req.user.id;
            
            // Validate UUID
            if (!isValidUUID(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
            }
            
            const availability = await availabilityRepository.getUserAvailability(userId);

            res.json({
                success: true,
                data: availability
            });
        } catch (error) {
            logger.error('Error fetching user availability:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch availability',
                error: error.message
            });
        }
    }

    /**
     * Save user availability
     * POST /api/availability
     * Body: { availability: [{day_of_week: 'Mon', time_slot: 'morning'}] }
     */
    async saveAvailability(req, res) {
        try {
            const userId = req.user.id;
            const { availability } = req.body;

            // Validate UUID
            if (!isValidUUID(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
            }

            // Validate input type
            if (!availability || !Array.isArray(availability)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid availability data. Expected array of {day_of_week, time_slot}'
                });
            }

            // Prevent excessive data (max 35 slots = 7 days * 5 time slots)
            if (availability.length > 35) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid data: Maximum 35 time slots allowed'
                });
            }

            // Validate each entry with strict whitelist validation
            const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const validTimeSlots = ['morning', 'late_morning', 'afternoon', 'late_afternoon', 'evening'];

            // Group by day for repository format
            const groupedByDay = {};
            
            for (const entry of availability) {
                // Validate day
                const sanitizedDay = sanitizeString(entry.day_of_week);
                if (!sanitizedDay || !validDays.includes(sanitizedDay)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid day: ${entry.day_of_week}. Must be one of: ${validDays.join(', ')}` 
                    });
                }
                
                // Validate time slot
                const sanitizedSlot = sanitizeString(entry.time_slot);
                if (!sanitizedSlot || !validTimeSlots.includes(sanitizedSlot)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid time slot: ${entry.time_slot}. Must be one of: ${validTimeSlots.join(', ')}`
                    });
                }
                
                // Group by day
                if (!groupedByDay[sanitizedDay]) {
                    groupedByDay[sanitizedDay] = [];
                }
                if (!groupedByDay[sanitizedDay].includes(sanitizedSlot)) {
                    groupedByDay[sanitizedDay].push(sanitizedSlot);
                }
            }

            // Convert to repository format
            const sanitizedAvailability = Object.entries(groupedByDay).map(([day, slots]) => ({
                dayOfWeek: day,
                timeSlots: slots
            }));

            const savedAvailability = await availabilityRepository.saveAvailability(userId, sanitizedAvailability);

            // Mark availability as completed in onboarding
            try {
                await onboardingService.markAvailabilityCompleted(userId);
                logger.info(`Availability onboarding marked complete for user ${userId}`);
            } catch (onboardingError) {
                // Log but don't fail the request if onboarding update fails
                logger.error('Error marking availability onboarding complete:', onboardingError);
            }

            logger.info(`User ${userId} saved availability: ${availability.length} slots across ${sanitizedAvailability.length} days`);

            res.json({
                success: true,
                message: 'Availability saved successfully',
                data: savedAvailability
            });
        } catch (error) {
            logger.error('Error saving user availability:', { error: error.message, stack: error.stack });
            const status = error.message?.includes('Invalid') ? 400 : 500;
            res.status(status).json({
                success: false,
                message: error.message || 'Failed to save availability',
                error: error.message
            });
        }
    }

    /**
     * Clear user availability
     * DELETE /api/availability
     */
    async clearAvailability(req, res) {
        try {
            const userId = req.user.id;
            
            // Validate UUID
            if (!isValidUUID(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
            }
            
            await availabilityRepository.clearAvailability(userId);

            logger.info(`User ${userId} cleared their availability`);

            res.json({
                success: true,
                message: 'Availability cleared successfully'
            });
        } catch (error) {
            logger.error('Error clearing user availability:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to clear availability',
                error: error.message
            });
        }
    }

    /**
     * Get availability for multiple users (for matching/finding compatible players)
     * POST /api/availability/users
     * Body: { userIds: ['uuid1', 'uuid2'] }
     */
    async getMultipleUsersAvailability(req, res) {
        try {
            const { userIds } = req.body;

            // Validate input
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'userIds array is required'
                });
            }

            // Prevent excessive requests
            if (userIds.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 100 user IDs allowed per request'
                });
            }

            // Validate all UUIDs
            const invalidIds = userIds.filter(id => !isValidUUID(id));
            if (invalidIds.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid user ID format: ${invalidIds.slice(0, 3).join(', ')}${invalidIds.length > 3 ? '...' : ''}`
                });
            }

            const availability = await availabilityRepository.getMultipleUsersAvailability(userIds);

            res.json({
                success: true,
                data: availability
            });
        } catch (error) {
            logger.error('Error fetching multiple users availability:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users availability',
                error: error.message
            });
        }
    }
}

module.exports = new AvailabilityController();
