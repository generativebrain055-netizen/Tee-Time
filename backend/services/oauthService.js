const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const logger = require("../config/logger");

/**
 * OAuth Service
 * Handles OAuth token verification for Google and Apple
 */

// Initialize Google OAuth client
const googleClient = new OAuth2Client();

// Apple JWKS client for token verification
const appleJwksClient = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

/**
 * Verify Google ID Token
 * @param {string} idToken - Google ID token
 * @returns {Object} Verified payload with user info
 */
const verifyGoogleToken = async (idToken) => {
  try {
    const audiences = [
      process.env.GOOGLE_CLIENT_ID_IOS,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
      process.env.GOOGLE_CLIENT_ID_WEB,
    ].filter(Boolean);

    if (audiences.length === 0) {
      throw new Error("No Google Client IDs configured");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: audiences,
    });

    const payload = ticket.getPayload();

    // Validate required fields
    if (!payload.sub) {
      throw new Error("Invalid token: missing sub");
    }

    // Validate issuer
    if (!["accounts.google.com", "https://accounts.google.com"].includes(payload.iss)) {
      throw new Error("Invalid token issuer");
    }

    // Validate expiration
    if (payload.exp * 1000 < Date.now()) {
      throw new Error("Token expired");
    }

    logger.info("Google token verified successfully", {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
    });

    return {
      provider: "google",
      providerUserId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified || false,
      name: payload.name,
      givenName: payload.given_name,
      familyName: payload.family_name,
      picture: payload.picture,
      locale: payload.locale,
    };
  } catch (error) {
    logger.error("Google token verification failed:", error);
    throw new Error("Invalid Google token");
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

      // Verify with Apple's public key
      jwt.verify(
        identityToken,
        getAppleSigningKey,
        {
          audience: process.env.APPLE_CLIENT_ID || process.env.APPLE_SERVICE_ID,
          issuer: "https://appleid.apple.com",
          algorithms: ["RS256"],
        },
        (err, payload) => {
          if (err) {
            logger.error("Apple token verification failed:", err);
            reject(new Error("Invalid Apple token"));
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
            emailVerified: payload.email_verified === "true" || payload.email_verified === true,
            isPrivateEmail: payload.is_private_email === "true" || payload.is_private_email === true,
          });
        }
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
    { expiresIn: "15m" } // Short-lived
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

module.exports = {
  verifyGoogleToken,
  verifyAppleToken,
  generateTempToken,
  verifyTempToken,
};
