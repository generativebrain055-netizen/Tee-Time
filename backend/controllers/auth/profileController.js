const userRepository = require("../../repositories/userRepository");
const logger = require("../../config/logger");

/**
 * Profile Controller
 * Handles user profile operations
 */

/**
 * Get current user profile
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
        socialRate: user.social_rate,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        location: user.location,
        homeCourse: user.home_course,
        preferredTeeTime: user.preferred_tee_time,
        walkOrRide: user.walk_or_ride,
        roundsPlayed: user.rounds_played,
        averageScore: user.average_score,
        isVerified: user.is_verified,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    logger.error("Error in getCurrentUser:", error);
    next(error);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, handicap, location, equipment, preferences } = req.body;

    // Build update object
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email;
    if (handicap !== undefined) updates.handicap = handicap;

    const user = await userRepository.update(userId, updates);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        handicap: user.handicap,
        socialRate: user.social_rate,
      },
    });
  } catch (error) {
    logger.error("Error in updateProfile:", error);
    next(error);
  }
};

module.exports = {
  getCurrentUser,
  updateProfile,
};
