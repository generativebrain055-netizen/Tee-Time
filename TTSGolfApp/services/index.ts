/**
 * Services Index
 * Re-exports all service modules for cleaner imports
 */

// OAuth Service
export {
  oauthService,
  signInWithGoogle,
  signInWithApple,
  completeOAuthProfile,
  isUserCancellation,
  formatOAuthError,
  OAuthError,
  NetworkError,
} from "./oauthService";

// API Services (modular)
export {
  // Core
  apiCall,
  getAuthHeaders,
  refreshAccessToken,
  ApiError,
  buildQueryString,
  // Domain APIs
  rosterApi,
  teeTimeApi,
  inviteApi,
  friendApi,
  profileApi,
  courseApi,
  notificationApi,
  socialRateApi,
  attendanceApi,
  draftApi,
} from "./api";

// Re-export all types
export type * from "./api";

// Legacy API exports for backward compatibility
// TODO: Migrate consumers to use modular imports from ./api
export * from "./api.legacy";
