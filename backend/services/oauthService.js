const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const logger = require("../config/logger");
const admin = require("firebase-admin");

/**
 * OAuth Service
 * Handles OAuth token verification for Google (via Firebase) and Apple
 */

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "teetime-db29d",
  });
}

// Apple JWKS client for token verification
const appleJwksClient = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

/**
 * Verify Google ID Token (Firebase)
 * @param {string} idToken - Firebase ID token from Google Sign-In
 * @returns {Object} Verified payload with user info
 */
const verifyGoogleToken = async (idToken) => {
  try {
    // Verify Firebase ID token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Validate required fields
    if (!decodedToken.uid) {
      throw new Error("Invalid token: missing uid");
    }

    logger.info("Firebase token verified successfully", {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
    });

    return {
      provider: "google",
      providerUserId: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      name: decodedToken.name,
      givenName: decodedToken.given_name,
      familyName: decodedToken.family_name,
      picture: decodedToken.picture,
      locale: decodedToken.locale,
    };
  } catch (error) {
    logger.error("Firebase token verification failed:", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error("Invalid Google token: " + error.message);
  }
};

/**
 * Verify Google Access Token using Google's tokeninfo endpoint
 * This is used for implicit grant flow where we get an access token instead of ID token
 * @param {string} accessToken - Google access token
 * @returns {Object} Verified payload with user info
 */
const verifyGoogleAccessToken = async (accessToken) => {
  try {
    // Verify the access token with Google's tokeninfo endpoint
    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`,
    );

    if (!tokenInfoResponse.ok) {
      const errorData = await tokenInfoResponse.json().catch(() => ({}));
      logger.error("Google tokeninfo request failed:", {
        status: tokenInfoResponse.status,
        error: errorData,
      });
      throw new Error("Invalid Google access token");
    }

    const tokenInfo = await tokenInfoResponse.json();

    // Validate the audience matches our client ID
    const validClientIds = [
      process.env.GOOGLE_CLIENT_ID_IOS,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
      process.env.GOOGLE_CLIENT_ID_WEB,
    ].filter(Boolean);

    // For access tokens, check the azp (authorized party) or aud
    const tokenAudience = tokenInfo.azp || tokenInfo.aud;
    if (!validClientIds.includes(tokenAudience)) {
      logger.warn("Access token audience mismatch", {
        tokenAudience,
        validClientIds,
      });
      throw new Error("Token was not issued for this application");
    }

    // Validate token hasn't expired
    if (tokenInfo.expires_in <= 0) {
      throw new Error("Access token has expired");
    }

    // Now fetch user info using the access token
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.json().catch(() => ({}));
      logger.error("Google userinfo request failed:", {
        status: userInfoResponse.status,
        error: errorData,
      });
      throw new Error("Failed to fetch user info from Google");
    }

    const userInfo = await userInfoResponse.json();

    logger.info("Google access token verified successfully", {
      sub: userInfo.id,
      email: userInfo.email,
      verified_email: userInfo.verified_email,
    });

    return {
      provider: "google",
      providerUserId: userInfo.id,
      email: userInfo.email,
      emailVerified: userInfo.verified_email || false,
      name: userInfo.name,
      givenName: userInfo.given_name,
      familyName: userInfo.family_name,
      picture: userInfo.picture,
      locale: userInfo.locale,
    };
  } catch (error) {
    logger.error("Google access token verification failed:", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error("Failed to verify Google access token: " + error.message);
  }
};

/**
 * Exchange Google authorization code for ID token
 * Used with PKCE flow (Expo Go with auth proxy)
 * @param {string} code - Authorization code from Google
 * @param {string} codeVerifier - PKCE code verifier
 * @param {string} redirectUri - The redirect URI used in the auth request
 * @returns {Object} Verified payload with user info
 */
const exchangeGoogleCode = async (code, codeVerifier, redirectUri) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID_WEB;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId) {
      throw new Error("Google Web Client ID not configured");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        ...(clientSecret && { client_secret: clientSecret }),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        ...(codeVerifier && { code_verifier: codeVerifier }),
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      logger.error("Google token exchange failed:", {
        status: tokenResponse.status,
        error: errorData,
      });
      throw new Error(
        errorData.error_description || "Failed to exchange authorization code",
      );
    }

    const tokens = await tokenResponse.json();

    // Verify the ID token
    if (!tokens.id_token) {
      throw new Error("No ID token in response");
    }

    return await verifyGoogleToken(tokens.id_token);
  } catch (error) {
    logger.error("Google code exchange failed:", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error("Failed to exchange Google code: " + error.message);
  }
};

/**
 * Get Apple signing key
 */
const getAppleSigningKey = (header, callback) => {
  appleJwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
};

/**
 * Verify Apple ID Token
 * @param {string} identityToken - Apple identity token
 * @returns {Object} Verified payload with user info
 */
const verifyAppleToken = async (identityToken) => {
  return new Promise((resolve, reject) => {
    try {
      // First decode to check basic structure
      const decoded = jwt.decode(identityToken, { complete: true });

      if (!decoded) {
        throw new Error("Invalid token format");
      }

      // Log the token's audience for debugging
      logger.info("Apple token decoded", {
        aud: decoded.payload.aud,
        iss: decoded.payload.iss,
        sub: decoded.payload.sub,
      });

      // Apple uses different audiences for different environments
      const audiences = [
        process.env.APPLE_CLIENT_ID,
        process.env.APPLE_SERVICE_ID,
        // Add bundle ID variations
        "com.teetimesocial.app",
        "com.teetimesocial.app.signin",
        // Expo Go development (case-sensitive!)
        "host.exp.Exponent",
      ].filter(Boolean);

      // Verify with Apple's public key
      jwt.verify(
        identityToken,
        getAppleSigningKey,
        {
          audience: audiences,
          issuer: "https://appleid.apple.com",
          algorithms: ["RS256"],
        },
        (err, payload) => {
          if (err) {
            logger.error("Apple token verification failed:", {
              error: err.message,
              expectedAudiences: audiences,
              actualAudience: decoded.payload.aud,
            });
            reject(new Error(`Invalid Apple token: ${err.message}`));
            return;
          }

          // Validate required fields
          if (!payload.sub) {
            reject(new Error("Invalid token: missing sub"));
            return;
          }

          // Validate expiration
          if (payload.exp * 1000 < Date.now()) {
            reject(new Error("Token expired"));
            return;
          }

          logger.info("Apple token verified successfully", {
            sub: payload.sub,
            email: payload.email,
            email_verified: payload.email_verified,
          });

          resolve({
            provider: "apple",
            providerUserId: payload.sub,
            email: payload.email,
            emailVerified:
              payload.email_verified === "true" ||
              payload.email_verified === true,
            isPrivateEmail:
              payload.is_private_email === "true" ||
              payload.is_private_email === true,
          });
        },
      );
    } catch (error) {
      logger.error("Apple token verification error:", error);
      reject(new Error("Invalid Apple token"));
    }
  });
};

/**
 * Generate temporary session token for incomplete OAuth flow
 * Used when additional info is required
 */
const generateTempToken = (data) => {
  return jwt.sign(
    {
      type: "temp_oauth",
      ...data,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }, // Short-lived
  );
};

/**
 * Verify temporary session token
 */
const verifyTempToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "temp_oauth") {
      throw new Error("Invalid token type");
    }
    return decoded;
  } catch (error) {
    logger.error("Temp token verification failed:", error);
    throw new Error("Invalid or expired temporary token");
  }
};

// ============ USER IDENTITY FUNCTIONS ============
// Moved from controller for proper separation of concerns

const userRepository = require("../repositories/userRepository");
const authProviderRepository = require("../repositories/authProviderRepository");

/**
 * Find or create user by OAuth provider identity
 * This is the SINGLE source of truth for OAuth user identity
 *
 * CRITICAL RULES:
 * 1. OAuth provider_user_id (sub claim) is the ONLY identity source
 * 2. Phone/Email are PROFILE DATA only - never used for identity matching
 *
 * @param {Object} params - OAuth verification data
 * @returns {Object} - { user, isNewUser }
 */
const findOrCreateOAuthUser = async ({
  provider,
  providerUserId,
  email,
  emailVerified,
  firstName,
  lastName,
  picture,
  isPrivateEmail = false,
}) => {
  // Check if provider link exists (THIS IS THE IDENTITY CHECK)
  const providerLink = await authProviderRepository.findByProvider(
    provider,
    providerUserId,
  );

  if (providerLink) {
    await authProviderRepository.updateLastUsed(providerLink.id);
    const user = await userRepository.findById(providerLink.user_id);

    logger.info("OAuth user found via provider link", {
      userId: user.id,
      provider,
      providerUserId: providerUserId.substring(0, 8) + "...",
    });

    return { user, isNewUser: false };
  }

  // No provider link - check if email exists in users table
  // If email exists, link OAuth provider to that user
  // If email doesn't exist, return flag indicating sign-up is needed
  
  const hasValidEmail = email && emailVerified && !isPrivateEmail;
  
  if (hasValidEmail) {
    // Check if user with this email already exists
    const existingUser = await userRepository.findByEmail(email);
    
    if (existingUser) {
      // Link OAuth provider to existing user
      await authProviderRepository.create({
        userId: existingUser.id,
        provider,
        providerUserId,
        providerEmail: email,
        providerData: {
          name: `${firstName || ""} ${lastName || ""}`.trim(),
          picture: picture || null,
          email_verified: emailVerified,
          is_private_email: isPrivateEmail,
        },
      });
      
      logger.info("OAuth provider linked to existing user", {
        userId: existingUser.id,
        provider,
        providerUserId: providerUserId.substring(0, 8) + "...",
      });
      
      return { user: existingUser, isNewUser: false };
    }
  }
  
  // Email doesn't exist or is not valid - return flag indicating sign-up is needed
  logger.info("OAuth user needs sign-up", {
    provider,
    providerUserId: providerUserId.substring(0, 8) + "...",
    hasEmail: !!email,
    emailVerified,
  });
  
  return {
    needsSignUp: true,
    oauthData: {
      provider,
      providerUserId,
      email: hasValidEmail ? email : null,
      firstName: firstName || null,
      lastName: lastName || null,
      picture: picture || null,
      emailVerified,
      isPrivateEmail,
    },
  };
};

/**
 * Check what profile fields are missing for OAuth users
 * @param {Object} user - User record
 * @returns {Object} - Profile completeness status
 */
const getProfileCompleteness = (user) => {
  const missingFields = [];

  if (!user.first_name) missingFields.push("firstName");
  if (!user.last_name) missingFields.push("lastName");
  if (!user.location) missingFields.push("location");
  if (!user.home_course) missingFields.push("homeCourse");

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    needsOnboarding: missingFields.length > 0,
  };
};

module.exports = {
  verifyGoogleToken,
  verifyGoogleAccessToken,
  exchangeGoogleCode,
  verifyAppleToken,
  generateTempToken,
  verifyTempToken,
  findOrCreateOAuthUser,
  getProfileCompleteness,
};
