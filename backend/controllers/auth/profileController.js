const userRepository = require("../../repositories/userRepository");
const teeTimeRepository = require("../../repositories/teeTimeRepository");
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

    logger.info("[GET_CURRENT_USER] Raw user data from DB:", {
      userId: user?.id,
      preferred_tee_time: user?.preferred_tee_time,
      walk_or_ride: user?.walk_or_ride,
      playing_partner_preference: user?.playing_partner_preference,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Mark past tee times as completed on app load
    try {
      const completedTeeTimes = await teeTimeRepository.markPastTeeTimesCompleted();
      if (completedTeeTimes.length > 0) {
        logger.info(`Auto-completed ${completedTeeTimes.length} past tee times on getCurrentUser`);
      }
    } catch (err) {
      logger.error("Error marking past tee times as completed:", err);
    }

    logger.info("[GET_CURRENT_USER] Returning preferences:", {
      preferredTeeTime: user.preferred_tee_time,
      walkOrRide: user.walk_or_ride,
      playingPartnerPreference: user.playing_partner_preference,
    });

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
        roundsPlayed: user.rounds_played,
        averageScore: user.average_score,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        // Include preferences as nested object for frontend compatibility
        preferences: {
          preferredTeeTime: user.preferred_tee_time,
          walkOrRide: user.walk_or_ride,
          playingPartnerPreference: user.playing_partner_preference,
        },
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
    const { 
      firstName, 
      lastName, 
      email, 
      handicap, 
      location, 
      homeCourse, 
      bio, 
      preferences 
    } = req.body;

    logger.info("📝 [PROFILE] Update request:", {
      userId,
      preferences,
      body: req.body,
    });

    // Build update object
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email;
    if (handicap !== undefined) updates.handicap = handicap;
    if (location !== undefined) updates.location = location;
    if (homeCourse !== undefined) updates.homeCourse = homeCourse;
    if (bio !== undefined) updates.bio = bio;
    
    // Handle preferences
    if (preferences) {
      if (preferences.preferredTeeTime !== undefined) {
        updates.preferredTeeTime = preferences.preferredTeeTime;
      }
      if (preferences.walkOrRide !== undefined) {
        updates.walkOrRide = preferences.walkOrRide;
      }
      if (preferences.playingPartnerPreference !== undefined) {
        updates.playingPartnerPreference = preferences.playingPartnerPreference;
      }
    }

    logger.info("📝 [PROFILE] Updates to apply:", updates);

    const user = await userRepository.updateProfile(userId, updates);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    logger.info("✅ [PROFILE] Updated user:", {
      playing_partner_preference: user.playing_partner_preference,
      preferred_tee_time: user.preferred_tee_time,
      walk_or_ride: user.walk_or_ride,
    });

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
        location: user.location,
        homeCourse: user.home_course,
        bio: user.bio,
        // Include preferences as nested object for frontend compatibility
        preferences: {
          preferredTeeTime: user.preferred_tee_time,
          walkOrRide: user.walk_or_ride,
          playingPartnerPreference: user.playing_partner_preference,
        },
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
