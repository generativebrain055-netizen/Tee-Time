const bcrypt = require("bcryptjs");
const userRepository = require("../../repositories/userRepository");
const sessionService = require("../../services/sessionService");
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
      preferredTeeTime,
      walkOrRide,
      playingPartnerPreference,
    } = req.body;

    logger.info("📝 [BACKEND] Direct user registration:", {
      phoneNumber,
      firstName,
      lastName,
      username,
      email,
      handicap,
      location,
      homeCourse,
      preferredTeeTime,
      walkOrRide,
      playingPartnerPreference,
    });

    // Check if user already exists
    const existingUser = await userRepository.findByPhoneNumber(phoneNumber);

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
      phoneNumber,
      firstName,
      lastName,
      username: username || `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`,
      email: email || null,
      handicap: handicap ? parseInt(handicap) : null,
      passwordHash: null,
      isVerified: true,
      location: location || null,
      homeCourse: homeCourse || null,
      preferredTeeTime: preferredTeeTime || null,
      walkOrRide: walkOrRide || null,
      playingPartnerPreference: playingPartnerPreference || null,
    });

    logger.info("✅ [BACKEND] User registered successfully:", {
      userId: user.id,
      phoneNumber,
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

module.exports = {
  setPassword,
  registerUser,
};
