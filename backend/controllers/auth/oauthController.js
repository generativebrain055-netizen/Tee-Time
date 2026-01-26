const logger = require("../../config/logger");
const userRepository = require("../../repositories/userRepository");
const authProviderRepository = require("../../repositories/authProviderRepository");
const sessionService = require("../../services/sessionService");
const oauthService = require("../../services/oauthService");

/**
 * OAuth Controller
 * Handles Google and Apple OAuth authentication
 * 
 * Flow:
 * 1. Verify OAuth token
 * 2. Check if provider link exists → login
 * 3. Check if email exists → link provider → login
 * 4. If no email or email not verified → require additional info
 * 5. Create user + link provider → login
 */

/**
 * Google Sign In
 * POST /auth/google
 * Body: { idToken, user?: { name: { firstName, lastName } } }
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

    // Step 1: Verify Google token
    const verifiedData = await oauthService.verifyGoogleToken(idToken);
    const { providerUserId, email, emailVerified, givenName, familyName, picture } = verifiedData;

    logger.info("Google OAuth attempt", {
      providerUserId,
      email,
      emailVerified,
    });

    // Step 2: Check if provider link exists
    const providerLink = await authProviderRepository.findByProvider("google", providerUserId);

    if (providerLink) {
      // Provider already linked - log user in
      await authProviderRepository.updateLastUsed(providerLink.id);

      const { accessToken, refreshToken } = await sessionService.createSession({
        userId: providerLink.user_id,
        req,
        rememberMe: false,
      });

      const user = await userRepository.findById(providerLink.user_id);

      logger.info("Google sign in successful (existing provider link)", {
        userId: user.id,
        email: user.email,
      });

      return res.json({
        status: "authenticated",
        success: true,
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
        },
      });
    }

    // Step 3: Check if user exists by email
    if (email && emailVerified) {
      const existingUser = await userRepository.findByEmail(email);

      if (existingUser) {
        // User exists - link this provider
        await authProviderRepository.create({
          userId: existingUser.id,
          provider: "google",
          providerUserId,
          providerEmail: email,
          providerData: {
            name: `${givenName || ""} ${familyName || ""}`.trim(),
            picture,
            email_verified: emailVerified,
          },
        });

        const { accessToken, refreshToken } = await sessionService.createSession({
          userId: existingUser.id,
          req,
          rememberMe: false,
        });

        logger.info("Google provider linked to existing user", {
          userId: existingUser.id,
          email,
        });

        return res.json({
          status: "authenticated",
          success: true,
          accessToken,
          refreshToken,
          user: {
            id: existingUser.id,
            phoneNumber: existingUser.phone_number,
            email: existingUser.email,
            username: existingUser.username,
            firstName: existingUser.first_name,
            lastName: existingUser.last_name,
            handicap: existingUser.handicap,
            socialRate: existingUser.social_rate,
          },
        });
      }
    }

    // Step 4: No existing user - need additional info
    // Generate temporary token
    const tempToken = oauthService.generateTempToken({
      provider: "google",
      providerUserId,
      email: email || null,
      emailVerified,
      givenName,
      familyName,
      picture,
    });

    logger.info("Google OAuth requires additional info", {
      providerUserId,
      hasEmail: !!email,
      emailVerified,
    });

    return res.json({
      status: "additional_info_required",
      success: true,
      tempToken,
      requiredFields: email && emailVerified ? ["phoneNumber"] : ["email", "phoneNumber"],
      providedData: {
        email: email && emailVerified ? email : null,
        firstName: givenName || null,
        lastName: familyName || null,
        picture: picture || null,
      },
      message: "Please complete your profile to continue",
    });
  } catch (error) {
    logger.error("Google sign in error:", error);
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

    // Step 1: Verify Apple token
    const verifiedData = await oauthService.verifyAppleToken(identityToken);
    const { providerUserId, email, emailVerified, isPrivateEmail } = verifiedData;

    // Apple only sends name on first sign-in via clientUserData
    const firstName = clientUserData?.name?.firstName || null;
    const lastName = clientUserData?.name?.lastName || null;

    logger.info("Apple OAuth attempt", {
      providerUserId,
      email,
      emailVerified,
      isPrivateEmail,
      hasName: !!(firstName || lastName),
    });

    // Step 2: Check if provider link exists
    const providerLink = await authProviderRepository.findByProvider("apple", providerUserId);

    if (providerLink) {
      // Provider already linked - log user in
      await authProviderRepository.updateLastUsed(providerLink.id);

      const { accessToken, refreshToken } = await sessionService.createSession({
        userId: providerLink.user_id,
        req,
        rememberMe: false,
      });

      const user = await userRepository.findById(providerLink.user_id);

      logger.info("Apple sign in successful (existing provider link)", {
        userId: user.id,
        email: user.email,
      });

      return res.json({
        status: "authenticated",
        success: true,
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
        },
      });
    }

    // Step 3: Check if user exists by email (only if email is verified and not private relay)
    if (email && emailVerified && !isPrivateEmail) {
      const existingUser = await userRepository.findByEmail(email);

      if (existingUser) {
        // User exists - link this provider
        await authProviderRepository.create({
          userId: existingUser.id,
          provider: "apple",
          providerUserId,
          providerEmail: email,
          providerData: {
            name: `${firstName || ""} ${lastName || ""}`.trim(),
            email_verified: emailVerified,
            is_private_email: isPrivateEmail,
          },
        });

        const { accessToken, refreshToken } = await sessionService.createSession({
          userId: existingUser.id,
          req,
          rememberMe: false,
        });

        logger.info("Apple provider linked to existing user", {
          userId: existingUser.id,
          email,
        });

        return res.json({
          status: "authenticated",
          success: true,
          accessToken,
          refreshToken,
          user: {
            id: existingUser.id,
            phoneNumber: existingUser.phone_number,
            email: existingUser.email,
            username: existingUser.username,
            firstName: existingUser.first_name,
            lastName: existingUser.last_name,
            handicap: existingUser.handicap,
            socialRate: existingUser.social_rate,
          },
        });
      }
    }

    // Step 4: No existing user - need additional info
    // Generate temporary token
    const tempToken = oauthService.generateTempToken({
      provider: "apple",
      providerUserId,
      email: email || null,
      emailVerified,
      isPrivateEmail,
      firstName,
      lastName,
    });

    logger.info("Apple OAuth requires additional info", {
      providerUserId,
      hasEmail: !!email,
      emailVerified,
      isPrivateEmail,
    });

    // Determine required fields
    const requiredFields = [];
    if (!email || !emailVerified || isPrivateEmail) {
      requiredFields.push("email");
    }
    requiredFields.push("phoneNumber");

    return res.json({
      status: "additional_info_required",
      success: true,
      tempToken,
      requiredFields,
      providedData: {
        email: email && emailVerified && !isPrivateEmail ? email : null,
        firstName: firstName || null,
        lastName: lastName || null,
      },
      message: "Please complete your profile to continue",
    });
  } catch (error) {
    logger.error("Apple sign in error:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Apple authentication failed",
    });
  }
};

/**
 * Complete OAuth Profile
 * POST /auth/complete-profile
 * Body: { tempToken, email, phoneNumber, firstName?, lastName?, username?, handicap? }
 */
const completeOAuthProfile = async (req, res, next) => {
  try {
    const { tempToken, email, phoneNumber, firstName, lastName, username, handicap } = req.body;

    if (!tempToken) {
      return res.status(400).json({
        success: false,
        error: "Temporary token is required",
      });
    }

    // Verify temp token
    const tokenData = oauthService.verifyTempToken(tempToken);
    const { provider, providerUserId, picture } = tokenData;

    // Use provided data or fallback to token data
    const finalEmail = email || tokenData.email;
    const finalFirstName = firstName || tokenData.givenName || tokenData.firstName;
    const finalLastName = lastName || tokenData.familyName || tokenData.lastName;

    // Validate required fields
    if (!finalEmail || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Email and phone number are required",
      });
    }

    if (!finalFirstName || !finalLastName) {
      return res.status(400).json({
        success: false,
        error: "First name and last name are required",
      });
    }

    // Check if email already exists
    const existingEmail = await userRepository.findByEmail(finalEmail);
    if (existingEmail) {
      // Email exists - link provider and log in
      await authProviderRepository.create({
        userId: existingEmail.id,
        provider,
        providerUserId,
        providerEmail: finalEmail,
        providerData: {
          name: `${finalFirstName} ${finalLastName}`.trim(),
          picture,
        },
      });

      const { accessToken, refreshToken } = await sessionService.createSession({
        userId: existingEmail.id,
        req,
        rememberMe: false,
      });

      logger.info("OAuth profile completed - linked to existing email", {
        userId: existingEmail.id,
        provider,
      });

      return res.json({
        status: "authenticated",
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: existingEmail.id,
          phoneNumber: existingEmail.phone_number,
          email: existingEmail.email,
          username: existingEmail.username,
          firstName: existingEmail.first_name,
          lastName: existingEmail.last_name,
          handicap: existingEmail.handicap,
          socialRate: existingEmail.social_rate,
        },
      });
    }

    // Check if phone already exists
    const existingPhone = await userRepository.findByPhoneNumber(phoneNumber);
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        error: "Phone number already registered",
      });
    }

    // Create new user
    const newUser = await userRepository.create({
      phoneNumber,
      email: finalEmail,
      firstName: finalFirstName,
      lastName: finalLastName,
      username: username || null,
      handicap: handicap || null,
      isVerified: true, // OAuth email is verified
    });

    // Link OAuth provider
    await authProviderRepository.create({
      userId: newUser.id,
      provider,
      providerUserId,
      providerEmail: finalEmail,
      providerData: {
        name: `${finalFirstName} ${finalLastName}`.trim(),
        picture,
      },
    });

    // Create session
    const { accessToken, refreshToken } = await sessionService.createSession({
      userId: newUser.id,
      req,
      rememberMe: false,
    });

    logger.info("OAuth profile completed - new user created", {
      userId: newUser.id,
      provider,
      email: finalEmail,
    });

    return res.status(201).json({
      status: "authenticated",
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        phoneNumber: newUser.phone_number,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        handicap: newUser.handicap,
        socialRate: newUser.social_rate,
      },
    });
  } catch (error) {
    logger.error("Complete OAuth profile error:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to complete profile",
    });
  }
};

module.exports = {
  googleSignIn,
  appleSignIn,
  completeOAuthProfile,
};
