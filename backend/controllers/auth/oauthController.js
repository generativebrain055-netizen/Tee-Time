const logger = require("../../config/logger");
const userRepository = require("../../repositories/userRepository");
const authProviderRepository = require("../../repositories/authProviderRepository");
const sessionService = require("../../services/sessionService");
const oauthService = require("../../services/oauthService");
const { formatUser } = require("../../formatters/userFormatter");

/**
 * OAuth Controller - Thin Controller Pattern
 *
 * RESPONSIBILITIES:
 * - HTTP request/response handling
 * - Input validation
 * - Calling service layer
 * - Response formatting
 *
 * Business logic lives in oauthService.js:
 * - findOrCreateOAuthUser
 * - getProfileCompleteness
 * - verifyGoogleToken, verifyAppleToken
 */

/**
 * Google Sign In
 * POST /auth/google
 * Body: { idToken, user?: { name: { firstName, lastName } } }
 *
 * ALWAYS returns authenticated status or error. Never blocks for "additional info".
 */
const googleSignIn = async (req, res, next) => {
  try {
    const { idToken, user: clientUserData } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: "ID token is required",
      });
    }

    // Verify Google token
    const verifiedData = await oauthService.verifyGoogleToken(idToken);
    const {
      providerUserId,
      email,
      emailVerified,
      givenName,
      familyName,
      picture,
    } = verifiedData;

    logger.info("Google OAuth attempt", {
      providerUserId: providerUserId.substring(0, 8) + "...",
      email,
      emailVerified,
    });

    // Find or create user (business logic in service)
    const { user, isNewUser } = await oauthService.findOrCreateOAuthUser({
      provider: "google",
      providerUserId,
      email,
      emailVerified,
      firstName: givenName || clientUserData?.name?.firstName,
      lastName: familyName || clientUserData?.name?.lastName,
      picture,
    });

    // Create session
    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
      rememberMe: false,
    });

    logger.info("Google sign in successful", {
      userId: user.id,
      isNewUser,
    });

    // Check profile completeness (business logic in service)
    const profileStatus = oauthService.getProfileCompleteness(user);

    return res.json({
      status: "authenticated",
      success: true,
      accessToken,
      refreshToken,
      user: formatUser(user),
      isNewUser,
      needsOnboarding: profileStatus.needsOnboarding,
      missingFields: profileStatus.missingFields,
      profileIncomplete: !profileStatus.isComplete,
      ...(profileStatus.needsOnboarding && {
        message: "Please complete your profile to continue",
      }),
    });
  } catch (error) {
    logger.error("Google sign in error:", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(400).json({
      success: false,
      error: error.message || "Google authentication failed",
    });
  }
};

/**
 * Apple Sign In
 * POST /auth/apple
 * Body: { identityToken, user?: { name: { firstName, lastName }, email } }
 *
 * ALWAYS returns authenticated status or error. Never blocks for "additional info".
 */
const appleSignIn = async (req, res, next) => {
  try {
    const { identityToken, user: clientUserData } = req.body;

    if (!identityToken) {
      return res.status(400).json({
        success: false,
        error: "Identity token is required",
      });
    }

    // Verify Apple token
    const verifiedData = await oauthService.verifyAppleToken(identityToken);
    const { providerUserId, email, emailVerified, isPrivateEmail } =
      verifiedData;

    // Apple only sends name on FIRST sign-in via clientUserData
    const firstName = clientUserData?.name?.firstName || null;
    const lastName = clientUserData?.name?.lastName || null;

    logger.info("Apple OAuth attempt", {
      providerUserId: providerUserId.substring(0, 8) + "...",
      email,
      emailVerified,
      isPrivateEmail,
      hasName: !!(firstName || lastName),
    });

    // Find or create user (business logic in service)
    const { user, isNewUser } = await oauthService.findOrCreateOAuthUser({
      provider: "apple",
      providerUserId,
      email,
      emailVerified,
      firstName,
      lastName,
      isPrivateEmail,
    });

    // Create session
    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
      rememberMe: false,
    });

    logger.info("Apple sign in successful", {
      userId: user.id,
      isNewUser,
    });

    // Check profile completeness (business logic in service)
    const profileStatus = oauthService.getProfileCompleteness(user);

    return res.json({
      status: "authenticated",
      success: true,
      accessToken,
      refreshToken,
      user: formatUser(user),
      isNewUser,
      needsOnboarding: profileStatus.needsOnboarding,
      missingFields: profileStatus.missingFields,
      profileIncomplete: !profileStatus.isComplete,
      ...(profileStatus.needsOnboarding && {
        message: "Please complete your profile to continue",
      }),
    });
  } catch (error) {
    logger.error("Apple sign in error:", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(400).json({
      success: false,
      error: error.message || "Apple authentication failed",
    });
  }
};

/**
 * Update OAuth User Profile
 * POST /auth/complete-profile
 *
 * Handles OAuth user onboarding - accepts name, location, and club info.
 * Also supports legacy tempToken flow for backward compatibility.
 *
 * Body: { firstName?, lastName?, location?, homeCourse?, phoneNumber?, username?, handicap? }
 * Or legacy: { tempToken, ... }
 */
const completeOAuthProfile = async (req, res, next) => {
  try {
    const {
      tempToken,
      firstName,
      lastName,
      phoneNumber,
      username,
      handicap,
      email,
      location,
      homeCourse,
    } = req.body;

    // LEGACY SUPPORT: If tempToken is provided, use old flow
    // This maintains backward compatibility during mobile app transition
    if (tempToken) {
      return handleLegacyTempTokenFlow(req, res);
    }

    // NEW FLOW: Require authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please sign in first.",
      });
    }

    const userId = req.user.id;

    // Build update object - only include provided fields
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phoneNumber) updates.phoneNumber = phoneNumber;
    if (username) updates.username = username;
    if (handicap !== undefined) updates.handicap = handicap;
    if (location) updates.location = location;
    if (homeCourse) updates.homeCourse = homeCourse;

    // Update profile
    const updatedUser = await userRepository.updateProfile(userId, updates);

    // Check profile completeness (business logic in service)
    const profileStatus = oauthService.getProfileCompleteness(updatedUser);

    logger.info("OAuth user profile updated", {
      userId,
      updatedFields: Object.keys(updates),
      isComplete: profileStatus.isComplete,
    });

    return res.json({
      success: true,
      user: formatUser(updatedUser),
      needsOnboarding: profileStatus.needsOnboarding,
      missingFields: profileStatus.missingFields,
      message: profileStatus.isComplete
        ? "Profile completed successfully"
        : "Profile updated successfully",
    });
  } catch (error) {
    logger.error("Complete OAuth profile error:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to update profile",
    });
  }
};

/**
 * LEGACY: Handle tempToken flow for backward compatibility
 * This exists only to prevent breaking existing mobile app versions.
 * Will be removed in a future release.
 */
const handleLegacyTempTokenFlow = async (req, res) => {
  const {
    tempToken,
    email,
    phoneNumber,
    firstName,
    lastName,
    username,
    handicap,
  } = req.body;

  logger.warn("DEPRECATED: Using legacy tempToken flow", {
    hasPhone: !!phoneNumber,
  });

  // Verify temp token
  const tokenData = oauthService.verifyTempToken(tempToken);
  const { provider, providerUserId, picture } = tokenData;

  // Check if provider link already exists (handles race conditions)
  const existingLink = await authProviderRepository.findByProvider(
    provider,
    providerUserId,
  );

  if (existingLink) {
    // User was already created - just return their session
    const user = await userRepository.findById(existingLink.user_id);

    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
      rememberMe: false,
    });

    return res.json({
      status: "authenticated",
      success: true,
      accessToken,
      refreshToken,
      user: formatUser(user),
    });
  }

  // Use provided data or fallback to token data
  const finalEmail = email || tokenData.email || null;
  const finalFirstName =
    firstName || tokenData.givenName || tokenData.firstName;
  const finalLastName = lastName || tokenData.familyName || tokenData.lastName;

  // Create user - phone is now OPTIONAL
  const newUser = await userRepository.create({
    phoneNumber: phoneNumber || null, // Phone is OPTIONAL for OAuth
    email: finalEmail,
    firstName: finalFirstName,
    lastName: finalLastName,
    username: username || null,
    handicap: handicap || null,
    isVerified: true,
  });

  // Link OAuth provider
  await authProviderRepository.create({
    userId: newUser.id,
    provider,
    providerUserId,
    providerEmail: finalEmail,
    providerData: {
      name: `${finalFirstName || ""} ${finalLastName || ""}`.trim(),
      picture,
    },
  });

  // Create session
  const { accessToken, refreshToken } = await sessionService.createSession({
    userId: newUser.id,
    req,
    rememberMe: false,
  });

  logger.info("Legacy OAuth profile completed", {
    userId: newUser.id,
    provider,
  });

  return res.status(201).json({
    status: "authenticated",
    success: true,
    accessToken,
    refreshToken,
    user: formatUser(newUser),
  });
};

module.exports = {
  googleSignIn,
  appleSignIn,
  completeOAuthProfile,
};
