const userRepository = require("../../repositories/userRepository");
const profileRepository = require("../../repositories/profileRepository");
const teeTimeRepository = require("../../repositories/teeTimeRepository");
const sessionService = require("../../services/sessionService");
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
        clubs: user.clubs || [],
        // Include preferences as nested object for frontend compatibility
        preferences: {
          preferredTeeTime: user.preferred_tee_time,
          walkOrRide: user.walk_or_ride,
          playingPartnerPreference: user.playing_partner_preference,
          drinkOfChoice: user.drink_of_choice,
        },
        // Include notification preferences and privacy settings
        notificationPreferences: user.notification_preferences || {
          email: true,
          sms: true,
          push: true,
        },
        privacySettings: user.privacy_settings || {
          showHandicap: true,
          showLocation: true,
          showPhone: false,
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
      phoneNumber,
      handicap,
      location,
      homeCourse,
      bio,
      zipCode,
      avatarUrl,
      profilePhotoBase64,
      preferences,
      clubs,
      notificationPreferences,
      privacySettings,
    } = req.body;

    logger.info("📝 [PROFILE] Update request:", {
      userId,
      preferences,
      clubs: clubs ? `${clubs.length} clubs` : 'no clubs',
      body: { ...req.body, profilePhotoBase64: req.body.profilePhotoBase64 ? "[base64]" : undefined },
    });

    // Build update object
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (handicap !== undefined) updates.handicap = handicap;
    if (location !== undefined) updates.location = location;
    if (homeCourse !== undefined) updates.homeCourse = homeCourse;
    if (bio !== undefined) updates.bio = bio;
    if (zipCode !== undefined) updates.zipCode = zipCode;
    if (avatarUrl) updates.avatarUrl = avatarUrl;

    // Upload profile photo if base64 provided
    if (profilePhotoBase64) {
      try {
        const avatarUploadService = require("../../services/avatarUploadService");
        updates.avatarUrl = await avatarUploadService.uploadAvatar(profilePhotoBase64, userId);
      } catch (uploadErr) {
        logger.error("Avatar upload failed:", uploadErr);
        return res.status(400).json({
          success: false,
          message: uploadErr.message || "Failed to upload profile photo.",
        });
      }
    }
    
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
      if (preferences.drinkOfChoice !== undefined) {
        updates.drinkOfChoice = preferences.drinkOfChoice;
      }
    }

    // Handle clubs array
    if (clubs !== undefined) {
      updates.clubs = clubs;
      logger.info("📝 [PROFILE] Updating clubs:", { clubs });
    }

    logger.info("📝 [PROFILE] Updates to apply:", updates);

    const user = await userRepository.updateProfile(userId, updates);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Handle notification preferences and privacy settings separately (they're in user_profiles table)
    if (notificationPreferences !== undefined) {
      try {
        await profileRepository.updateNotificationPreferences(userId, notificationPreferences);
        logger.info("📝 [PROFILE] Updated notification preferences:", notificationPreferences);
      } catch (err) {
        logger.error("Error updating notification preferences:", err);
        // Don't fail the entire request, just log the error
      }
    }

    if (privacySettings !== undefined) {
      try {
        await profileRepository.updatePrivacySettings(userId, privacySettings);
        logger.info("📝 [PROFILE] Updated privacy settings:", privacySettings);
      } catch (err) {
        logger.error("Error updating privacy settings:", err);
        // Don't fail the entire request, just log the error
      }
    }

    // Refresh user data to get updated preferences and settings
    const updatedUser = await userRepository.findById(userId);

    logger.info("✅ [PROFILE] Updated user:", {
      playing_partner_preference: updatedUser?.playing_partner_preference,
      preferred_tee_time: updatedUser?.preferred_tee_time,
      walk_or_ride: updatedUser?.walk_or_ride,
    });

    // Use updatedUser if available, otherwise fall back to user
    const finalUser = updatedUser || user;

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: finalUser.id,
        phoneNumber: finalUser.phone_number,
        email: finalUser.email,
        firstName: finalUser.first_name,
        lastName: finalUser.last_name,
        username: finalUser.username,
        handicap: finalUser.handicap,
        socialRate: finalUser.social_rate,
        avatarUrl: finalUser.avatar_url || null,
        zipCode: finalUser.zip_code || null,
        location: finalUser.location,
        homeCourse: finalUser.home_course,
        bio: finalUser.bio,
        clubs: finalUser.clubs || [],
        // Include preferences as nested object for frontend compatibility
        preferences: {
          preferredTeeTime: finalUser.preferred_tee_time,
          walkOrRide: finalUser.walk_or_ride,
          playingPartnerPreference: finalUser.playing_partner_preference,
          drinkOfChoice: finalUser.drink_of_choice,
        },
        // Include notification preferences and privacy settings
        notificationPreferences: finalUser.notification_preferences || {
          email: true,
          sms: true,
          push: true,
        },
        privacySettings: finalUser.privacy_settings || {
          showHandicap: true,
          showLocation: true,
          showPhone: false,
        },
      },
    });
  } catch (error) {
    logger.error("Error in updateProfile:", error);
    next(error);
  }
};

/**
 * DELETE /api/auth/account — soft-delete current user and revoke all sessions
 */
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await sessionService.revokeAllSessions(userId, null, "account_deleted");
    await userRepository.softDelete(userId);
    logger.info("[deleteAccount] Account soft-deleted", { userId });
    return res.json({
      success: true,
      message: "Your account has been deleted.",
    });
  } catch (error) {
    logger.error("Error in deleteAccount:", error);
    next(error);
  }
};

module.exports = {
  getCurrentUser,
  updateProfile,
  deleteAccount,
};
