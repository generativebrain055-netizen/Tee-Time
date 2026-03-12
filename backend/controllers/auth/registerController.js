const bcrypt = require("bcryptjs");
const userRepository = require("../../repositories/userRepository");
const magicLinkRepository = require("../../repositories/magicLinkRepository");
const sessionService = require("../../services/sessionService");
const avatarUploadService = require("../../services/avatarUploadService");
const { normalizePhoneToE164 } = require("../../utils/validation");
const logger = require("../../config/logger");

/**
 * Register Controller
 * Handles user registration and password setting
 */

/**
 * Set Password (after OTP verification)
 */
const setPassword = async (req, res, next) => {
  try {
    const { phoneNumber, password, firstName, lastName, username, handicap } = req.body;

    // Validate password
    const validation = require("../../utils/validation");
    const passwordValidation = validation.validatePassword(password);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.errors[0],
        errors: passwordValidation.errors,
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create or update user
    let user = await userRepository.findByPhoneNumber(phoneNumber);

    if (user) {
      user = await userRepository.updatePassword(user.id, passwordHash);
    } else {
      user = await userRepository.create({
        phoneNumber,
        firstName,
        lastName,
        username,
        handicap,
        passwordHash,
        isVerified: true,
      });
    }

    // Create session
    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
      rememberMe: false,
    });

    return res.json({
      success: true,
      message: "Account created successfully.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
      },
    });
  } catch (error) {
    logger.error("Error in setPassword:", error);
    next(error);
  }
};

/**
 * Direct user registration (passwordless, no OTP required)
 */
const registerUser = async (req, res, next) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      username,
      email,
      handicap,
      location,
      homeCourse,
      clubs, // Support clubs array
      preferredTeeTime,
      walkOrRide,
      playingPartnerPreference,
      drinkOfChoice,
      zipCode,
      avatarUrl,
      profilePhotoBase64,
    } = req.body;

    let resolvedAvatarUrl = avatarUrl || null;
    if (profilePhotoBase64) {
      try {
        resolvedAvatarUrl = await avatarUploadService.uploadAvatar(profilePhotoBase64);
      } catch (uploadErr) {
        logger.error("Avatar upload failed:", uploadErr);
        return res.status(400).json({
          success: false,
          message: uploadErr.message || "Failed to upload profile photo.",
        });
      }
    }

    const e164 = phoneNumber ? normalizePhoneToE164(phoneNumber) : null;
    if (!e164) {
      return res.status(400).json({
        success: false,
        message: "Valid phone number is required.",
      });
    }

    // Normalize clubs: use clubs array if provided, otherwise fall back to homeCourse
    const clubsArray = Array.isArray(clubs) && clubs.length > 0
      ? clubs
      : homeCourse
        ? [{ name: homeCourse, location: null, type: "Public" }]
        : [];

    logger.info("📝 [BACKEND] Direct user registration:", {
      phoneNumber: e164,
      firstName,
      lastName,
      username,
      email,
      handicap,
      location,
      homeCourse,
      clubsCount: clubsArray.length,
      preferredTeeTime,
      walkOrRide,
      playingPartnerPreference,
    });

    // Validate phone was recently verified via SMS magic link
    const verifiedLink = await magicLinkRepository.findRecentlyVerifiedByPhone(e164, 60);
    if (!verifiedLink) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be verified first. Please complete the verification link sent to your phone.",
      });
    }

    // Check if user already exists
    const existingUser = await userRepository.findByPhoneNumber(e164);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this phone number already exists. Please login instead.",
      });
    }

    // Check if username is taken
    if (username) {
      const existingUsername = await userRepository.findByUsername(username);
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "This username is already taken. Please choose another.",
        });
      }
    }

    // Create new user (passwordless) with all profile data
    const user = await userRepository.create({
      phoneNumber: e164,
      firstName,
      lastName,
      username: username || `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`,
      email: email || null,
      handicap: handicap ? parseInt(handicap) : null,
      passwordHash: null,
      isVerified: true,
      location: location || null,
      homeCourse: clubsArray.length > 0 ? clubsArray[0].name : (homeCourse || null), // First club as homeCourse for backward compatibility
      clubs: clubsArray, // Save clubs array
      preferredTeeTime: preferredTeeTime || null,
      walkOrRide: walkOrRide || null,
      playingPartnerPreference: playingPartnerPreference || null,
      drinkOfChoice: drinkOfChoice || null,
      zipCode: zipCode || null,
      avatarUrl: resolvedAvatarUrl,
    });

    logger.info("✅ [BACKEND] User registered successfully:", {
      userId: user.id,
      phoneNumber: e164,
      username: user.username,
    });

    return res.json({
      success: true,
      message: "Account created successfully. Please login to continue.",
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
        socialRate: user.social_rate,
        avatarUrl: user.avatar_url || null,
        zipCode: user.zip_code || null,
        location: user.location,
        homeCourse: user.home_course,
        preferredTeeTime: user.preferred_tee_time,
        walkOrRide: user.walk_or_ride,
        playingPartnerPreference: user.playing_partner_preference,
      },
    });
  } catch (error) {
    logger.error("Error in registerUser:", error);
    next(error);
  }
};

/**
 * Upload profile photo. Returns public URL. If user is authenticated, also persists to profile.
 */
const uploadAvatar = async (req, res, next) => {
  try {
    const { imageBase64, profilePhotoBase64 } = req.body;
    const base64 = imageBase64 || profilePhotoBase64;

    if (!base64) {
      return res.status(400).json({
        success: false,
        message: "Image data is required (imageBase64 or profilePhotoBase64).",
      });
    }

    const userId = req.user?.id || null;
    const avatarUrl = await avatarUploadService.uploadAvatar(base64, userId);

    if (userId) {
      const userRepository = require("../../repositories/userRepository");
      await userRepository.updateProfile(userId, { avatarUrl });
      const updatedUser = await userRepository.findById(userId);
      return res.json({
        success: true,
        avatarUrl,
        user: updatedUser ? {
          id: updatedUser.id,
          phoneNumber: updatedUser.phone_number,
          email: updatedUser.email,
          username: updatedUser.username,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          handicap: updatedUser.handicap,
          socialRate: updatedUser.social_rate,
          avatarUrl: updatedUser.avatar_url || null,
          bio: updatedUser.bio,
          location: updatedUser.location,
          homeCourse: updatedUser.home_course,
          clubs: updatedUser.clubs || [],
          preferences: {
            preferredTeeTime: updatedUser.preferred_tee_time,
            walkOrRide: updatedUser.walk_or_ride,
            playingPartnerPreference: updatedUser.playing_partner_preference,
            drinkOfChoice: updatedUser.drink_of_choice,
          },
        } : undefined,
      });
    }

    return res.json({
      success: true,
      avatarUrl,
    });
  } catch (error) {
    logger.error("Error in uploadAvatar:", error);
    next(error);
  }
};

/**
 * Register with username and password (no phone required)
 * Creates user and returns session tokens.
 */
const registerWithUsername = async (req, res, next) => {
  try {
    const { username, password, firstName, lastName, email } = req.body;

    const validation = require("../../utils/validation");
    const passwordValidation = validation.validatePassword(password);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.errors[0],
        errors: passwordValidation.errors,
      });
    }

    const trimmedUsername = (username || "").trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Username must be between 3 and 50 characters.",
      });
    }

    const existingUser = await userRepository.findByUsername(trimmedUsername);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This username is already taken. Please choose another.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      username: trimmedUsername,
      firstName: (firstName || "").trim() || null,
      lastName: (lastName || "").trim() || null,
      email: (email || "").trim() || null,
      passwordHash,
      isVerified: true,
    });

    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
      rememberMe: false,
    });

    return res.json({
      success: true,
      message: "Account created successfully.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        handicap: user.handicap,
        socialRate: user.social_rate,
        avatarUrl: user.avatar_url || null,
      },
    });
  } catch (error) {
    logger.error("Error in registerWithUsername:", error);
    next(error);
  }
};

module.exports = {
  setPassword,
  registerUser,
  registerWithUsername,
  uploadAvatar,
};
