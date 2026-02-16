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

    // For new users, require phone verification via SMS magic link
    if (isNewUser) {
      return res.json({
        status: "pending_phone_verification",
        success: true,
        needsPhoneVerification: true,
        providerData: {
          email,
          email_verified: emailVerified,
          first_name: givenName,
          last_name: familyName,
          firstName: givenName,
          lastName: familyName,
          picture,
        },
        message: "Please verify your phone number to complete sign up",
      });
    }

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
      providerData: {
        email,
        email_verified: emailVerified,
        first_name: givenName,
        last_name: familyName,
        firstName: givenName,
        lastName: familyName,
        picture,
      },
      ...(profileStatus.needsOnboarding && {
        message: "Please complete your profile to continue",
      }),
    });
  } catch (error) {
    logger.error("Google sign in error:", {
      error: error.message,
      stack: error.stack,
    });
    const message =
      error.message?.includes("token") || error.message?.includes("expired")
        ? "Sign-in session expired. Please try again."
        : error.message || "Google sign-in failed. Please try again.";
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
};

/**
 * Google OAuth Callback (Custom Redirect Handler)
 * GET /auth/google/callback?code=...&state=...
 * 
 * This endpoint receives the OAuth callback from Google, exchanges the code
 * for tokens, creates a session, and shows a success page that redirects back to the app.
 * 
 * This approach is more reliable than Expo's auth proxy for development.
 */
const googleOAuthCallback = async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      logger.error("Google OAuth callback error:", { error });
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1>Authentication Failed</h1>
          <p>Error: ${error}</p>
          <p>Please return to the app and try again.</p>
          <a href="teetimesocial://" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #5DB075; color: white; text-decoration: none; border-radius: 8px;">Return to App</a>
        </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send("Missing authorization code");
    }

    // Determine redirect URI based on environment
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/google/callback`;

    logger.info("Google OAuth callback received", {
      hasCode: !!code,
      redirectUri,
    });

    // Exchange code for tokens
    const verifiedData = await oauthService.exchangeGoogleCode(
      code,
      null, // No code verifier for server-side flow
      redirectUri,
    );

    const {
      providerUserId,
      email,
      emailVerified,
      givenName,
      familyName,
      picture,
    } = verifiedData;

    // Find or create user
    const { user, isNewUser } = await oauthService.findOrCreateOAuthUser({
      provider: "google",
      providerUserId,
      email,
      emailVerified,
      firstName: givenName,
      lastName: familyName,
      picture,
    });

    // Create session
    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
      rememberMe: false,
    });

    logger.info("Google OAuth callback successful", {
      userId: user.id,
      isNewUser,
    });

    // Store tokens in a temporary session that the app can retrieve
    // Using a short-lived token to pass data securely
    const tempToken = oauthService.generateTempToken({
      accessToken,
      refreshToken,
      user: formatUser(user),
      isNewUser,
      needsOnboarding: oauthService.getProfileCompleteness(user).needsOnboarding,
    });

    // Redirect to success page with deep link that includes the temp token
    const deepLink = `teetimesocial://oauth-callback?token=${tempToken}`;
    
    // Send success page with auto-redirect
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authentication Successful</title>
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
              }
              .container {
                  background: white;
                  border-radius: 20px;
                  padding: 40px;
                  max-width: 400px;
                  width: 100%;
                  text-align: center;
                  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              }
              .success-icon {
                  width: 80px;
                  height: 80px;
                  background: #5DB075;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 24px;
                  animation: scaleIn 0.5s ease-out;
              }
              .checkmark {
                  width: 40px;
                  height: 40px;
                  stroke: white;
                  stroke-width: 3;
                  fill: none;
              }
              h1 {
                  color: #1C1C1E;
                  font-size: 24px;
                  font-weight: 600;
                  margin-bottom: 12px;
              }
              p {
                  color: #6B7280;
                  font-size: 16px;
                  line-height: 1.5;
                  margin-bottom: 32px;
              }
              .app-link {
                  display: inline-block;
                  background: #5DB075;
                  color: white;
                  text-decoration: none;
                  padding: 14px 32px;
                  border-radius: 12px;
                  font-weight: 600;
                  font-size: 16px;
                  transition: all 0.3s ease;
              }
              @keyframes scaleIn {
                  from { transform: scale(0); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="success-icon">
                  <svg class="checkmark" viewBox="0 0 52 52">
                      <path d="M14 27l8 8 16-16"/>
                  </svg>
              </div>
              <h1>Authentication Successful!</h1>
              <p>Redirecting you back to TeeTime...</p>
              <a href="${deepLink}" class="app-link" id="returnButton">
                  Return to App
              </a>
          </div>
          <script>
              // Auto-redirect immediately
              window.location.href = '${deepLink}';
              
              // Fallback button
              document.getElementById('returnButton').addEventListener('click', (e) => {
                  e.preventDefault();
                  window.location.href = '${deepLink}';
              });
          </script>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error("Google OAuth callback error:", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h1>Authentication Error</h1>
        <p>${error.message}</p>
        <p>Please return to the app and try again.</p>
        <a href="teetimesocial://" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #5DB075; color: white; text-decoration: none; border-radius: 8px;">Return to App</a>
      </body>
      </html>
    `);
  }
};

/**
 * Google Sign In with Authorization Code (PKCE Flow)
 * POST /auth/google/code
 * Body: { code, codeVerifier, redirectUri }
 *
 * Used when client obtains authorization code (Expo Go with auth proxy)
 */
const googleSignInWithCode = async (req, res, next) => {
  try {
    const { code, codeVerifier, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Authorization code is required",
      });
    }

    if (!redirectUri) {
      return res.status(400).json({
        success: false,
        error: "Redirect URI is required",
      });
    }

    logger.info("Google OAuth code exchange attempt", {
      hasCode: !!code,
      hasCodeVerifier: !!codeVerifier,
      redirectUri,
    });

    // Exchange code for ID token and verify
    const verifiedData = await oauthService.exchangeGoogleCode(
      code,
      codeVerifier,
      redirectUri,
    );
    const {
      providerUserId,
      email,
      emailVerified,
      givenName,
      familyName,
      picture,
    } = verifiedData;

    // Find or create user (business logic in service)
    const { user, isNewUser } = await oauthService.findOrCreateOAuthUser({
      provider: "google",
      providerUserId,
      email,
      emailVerified,
      firstName: givenName,
      lastName: familyName,
      picture,
    });

    // Create session
    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: user.id,
      req,
      rememberMe: false,
    });

    logger.info("Google sign in (code exchange) successful", {
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
    logger.error("Google sign in (code exchange) error:", {
      error: error.message,
      stack: error.stack,
    });
    const message =
      error.message?.includes("token") || error.message?.includes("expired") || error.message?.includes("redirect")
        ? "Sign-in failed. Please try again."
        : error.message || "Google sign-in failed. Please try again.";
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
};

/**
 * Google Sign In with Access Token (Implicit Grant Flow)
 * POST /auth/google/token
 * Body: { accessToken }
 *
 * Used when client obtains access token directly (implicit flow) instead of ID token.
 * This is useful for Expo Go development where auth code exchange is problematic.
 */
const googleSignInWithAccessToken = async (req, res, next) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Access token is required",
      });
    }

    // Verify Google access token and get user info
    const verifiedData =
      await oauthService.verifyGoogleAccessToken(accessToken);
    const {
      providerUserId,
      email,
      emailVerified,
      givenName,
      familyName,
      picture,
    } = verifiedData;

    logger.info("Google OAuth (access token) attempt", {
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
      firstName: givenName,
      lastName: familyName,
      picture,
    });

    // Create session
    const { accessToken: sessionAccessToken, refreshToken } =
      await sessionService.createSession({
        userId: user.id,
        req,
        rememberMe: false,
      });

    logger.info("Google sign in (access token) successful", {
      userId: user.id,
      isNewUser,
    });

    // Check profile completeness (business logic in service)
    const profileStatus = oauthService.getProfileCompleteness(user);

    return res.json({
      status: "authenticated",
      success: true,
      accessToken: sessionAccessToken,
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
    logger.error("Google sign in (access token) error:", {
      error: error.message,
      stack: error.stack,
    });
    const message =
      error.message?.includes("token") || error.message?.includes("expired")
        ? "Sign-in session expired. Please try again."
        : error.message || "Google sign-in failed. Please try again.";
    return res.status(400).json({
      success: false,
      error: message,
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

    // For new users, require phone verification via SMS magic link
    if (isNewUser) {
      return res.json({
        status: "pending_phone_verification",
        success: true,
        needsPhoneVerification: true,
        providerData: {
          email,
          email_verified: emailVerified,
          is_private_email: isPrivateEmail,
          first_name: firstName,
          last_name: lastName,
          firstName,
          lastName,
          picture: null, // Apple doesn't provide profile pictures
        },
        message: "Please verify your phone number to complete sign up",
      });
    }

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
      providerData: {
        email,
        email_verified: emailVerified,
        is_private_email: isPrivateEmail,
        first_name: firstName,
        last_name: lastName,
        firstName,
        lastName,
        picture: null, // Apple doesn't provide profile pictures
      },
      ...(profileStatus.needsOnboarding && {
        message: "Please complete your profile to continue",
      }),
    });
  } catch (error) {
    logger.error("Apple sign in error:", {
      error: error.message,
      stack: error.stack,
    });
    const message =
      error.message?.includes("token") || error.message?.includes("expired")
        ? "Sign-in session expired. Please try again."
        : error.message || "Apple sign-in failed. Please try again.";
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
};

/**
 * Verify Temporary Token
 * POST /auth/verify-temp-token
 * Body: { token }
 * 
 * Verifies the temporary token from OAuth callback and returns session data
 */
const verifyTempTokenEndpoint = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required",
      });
    }

    // Verify the temp token
    const decoded = oauthService.verifyTempToken(token);

    logger.info("Temp token verified", {
      type: decoded.type,
      hasAccessToken: !!decoded.accessToken,
    });

    return res.json({
      success: true,
      accessToken: decoded.accessToken,
      refreshToken: decoded.refreshToken,
      user: decoded.user,
      isNewUser: decoded.isNewUser,
      needsOnboarding: decoded.needsOnboarding,
      missingFields: decoded.missingFields,
    });
  } catch (error) {
    logger.error("Temp token verification error:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Invalid or expired token",
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
      clubs, // Support clubs array
      zipCode,
      avatarUrl,
      profilePhotoBase64,
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

    // Normalize clubs: use clubs array if provided, otherwise fall back to homeCourse
    const clubsArray = Array.isArray(clubs) && clubs.length > 0
      ? clubs
      : homeCourse
        ? [{ name: homeCourse, location: null, type: "Public" }]
        : [];

    // Build update object - only include provided fields
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phoneNumber) updates.phoneNumber = phoneNumber;
    if (username) updates.username = username;
    if (handicap !== undefined) updates.handicap = handicap;
    if (location) updates.location = location;
    if (homeCourse || clubsArray.length > 0) {
      updates.homeCourse = clubsArray.length > 0 ? clubsArray[0].name : homeCourse;
    }
    if (clubsArray.length > 0) {
      updates.clubs = clubsArray; // Save clubs array
    }
    if (zipCode !== undefined) updates.zipCode = zipCode;
    if (avatarUrl) updates.avatarUrl = avatarUrl;

    // Upload profile photo if base64 provided (non-blocking: do not fail profile update)
    if (profilePhotoBase64) {
      try {
        const avatarUploadService = require("../../services/avatarUploadService");
        updates.avatarUrl = await avatarUploadService.uploadAvatar(profilePhotoBase64, userId);
      } catch (uploadErr) {
        logger.warn("Avatar upload failed (profile update continues):", uploadErr.message);
        delete updates.avatarUrl;
      }
    }

    // Update profile
    let updatedUser = await userRepository.updateProfile(userId, updates);
    // Re-fetch so response has latest DB state (e.g. phone_number)
    updatedUser = await userRepository.findById(userId);
    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        error: "Failed to load updated profile",
      });
    }

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
    location,
    homeCourse,
    clubs, // Support clubs array
    zipCode,
    avatarUrl,
    profilePhotoBase64,
    preferredTeeTime,
    walkOrRide,
    playingPartnerPreference,
    drinkOfChoice,
  } = req.body;

  let resolvedAvatarUrl = avatarUrl || null;
  if (profilePhotoBase64) {
    try {
      const avatarUploadService = require("../../services/avatarUploadService");
      resolvedAvatarUrl = await avatarUploadService.uploadAvatar(profilePhotoBase64);
    } catch (uploadErr) {
      logger.error("Avatar upload failed:", uploadErr);
      return res.status(400).json({
        success: false,
        error: uploadErr.message || "Failed to upload profile photo.",
      });
    }
  }

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

  // Normalize clubs: use clubs array if provided, otherwise fall back to homeCourse
  const clubsArray = Array.isArray(clubs) && clubs.length > 0
    ? clubs
    : homeCourse
      ? [{ name: homeCourse, location: null, type: "Public" }]
      : [];

  // Create user - phone is now OPTIONAL
  const newUser = await userRepository.create({
    phoneNumber: phoneNumber || null, // Phone is OPTIONAL for OAuth
    email: finalEmail,
    firstName: finalFirstName,
    lastName: finalLastName,
    username: username || null,
    handicap: handicap || null,
    isVerified: true,
    location: location || null,
    homeCourse: clubsArray.length > 0 ? clubsArray[0].name : (homeCourse || null),
    clubs: clubsArray,
    zipCode: zipCode || null,
    avatarUrl: resolvedAvatarUrl,
    preferredTeeTime: preferredTeeTime || null,
    walkOrRide: walkOrRide || null,
    playingPartnerPreference: playingPartnerPreference || null,
    drinkOfChoice: drinkOfChoice || null,
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
  googleOAuthCallback,
  googleSignInWithCode,
  googleSignInWithAccessToken,
  appleSignIn,
  completeOAuthProfile,
  verifyTempTokenEndpoint,
};
