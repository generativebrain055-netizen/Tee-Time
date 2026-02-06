/**
 * Auth Controllers Index
 * Re-exports all auth controller functions for backward compatibility
 *
 * Structure:
 * - otpController: requestOTP, verifyOTP
 * - loginController: login, logout, logoutAll
 * - tokenController: refreshToken
 * - profileController: getCurrentUser, updateProfile
 * - registerController: setPassword, registerUser
 * - magicLinkController: requestMagicLink, magicLinkRedirect, verifyMagicLink, requestSmsMagicLink, verifySmsMagicLink
 */

const otpController = require("./otpController");
const loginController = require("./loginController");
const tokenController = require("./tokenController");
const profileController = require("./profileController");
const registerController = require("./registerController");
const magicLinkController = require("./magicLinkController");
const oauthController = require("./oauthController");

module.exports = {
  // OTP operations
  requestOTP: otpController.requestOTP,
  verifyOTP: otpController.verifyOTP,

  // Login/Logout operations
  login: loginController.login,
  logout: loginController.logout,
  logoutAll: loginController.logoutAll,

  // Token operations
  refreshToken: tokenController.refreshToken,

  // Profile operations
  getCurrentUser: profileController.getCurrentUser,
  updateProfile: profileController.updateProfile,

  // Registration operations
  setPassword: registerController.setPassword,
  registerUser: registerController.registerUser,
  uploadAvatar: registerController.uploadAvatar,

  // Magic link operations
  requestMagicLink: magicLinkController.requestMagicLink,
  magicLinkRedirect: magicLinkController.magicLinkRedirect,
  verifyMagicLink: magicLinkController.verifyMagicLink,
  requestSmsMagicLink: magicLinkController.requestSmsMagicLink,
  requestSmsMagicLinkForLogin: magicLinkController.requestSmsMagicLinkForLogin,
  verifySmsMagicLink: magicLinkController.verifySmsMagicLink,

  // OAuth operations
  googleSignIn: oauthController.googleSignIn,
  googleOAuthCallback: oauthController.googleOAuthCallback,
  googleSignInWithCode: oauthController.googleSignInWithCode,
  googleSignInWithAccessToken: oauthController.googleSignInWithAccessToken,
  appleSignIn: oauthController.appleSignIn,
  completeOAuthProfile: oauthController.completeOAuthProfile,
  verifyTempTokenEndpoint: oauthController.verifyTempTokenEndpoint,
  completeSsoSignup: oauthController.completeSsoSignup,
};
