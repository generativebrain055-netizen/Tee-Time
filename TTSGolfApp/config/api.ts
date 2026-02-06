/**
 * API Configuration
 * TypeScript version with proper typing
 */

// Get API URL from environment variable or use default
const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || "https://api.teetimesocial.app";

/**
 * Get the API base URL
 */
const getApiUrl = (): string => {
  return API_BASE_URL;
};

/**
 * The base API URL
 */
export const API_URL: string = getApiUrl();

/**
 * API endpoint paths interface
 */
export interface ApiEndpoints {
  // Auth
  REQUEST_OTP: string;
  VERIFY_OTP: string;
  SET_PASSWORD: string;
  LOGIN: string;
  REFRESH_TOKEN: string;
  LOGOUT: string;
  LOGOUT_ALL: string;
  GET_CURRENT_USER: string;
  REQUEST_MAGIC_LINK: string;
  VERIFY_MAGIC_LINK: string;
  REQUEST_SMS_MAGIC_LINK: string;
  REQUEST_SMS_MAGIC_LINK_LOGIN: string;
  VERIFY_SMS_MAGIC_LINK: string;
  REGISTER: string;
  UPDATE_PROFILE: string;
  GOOGLE_SIGNIN: string;
  // Roster
  ROSTER: string;
  ROSTER_ON_DECK: string;
  ROSTER_SEARCH: string;
  ROSTER_REORDER: string;
  // Tee Times
  TEE_TIMES: string;
  TEE_TIMES_UPCOMING: string;
  TEE_TIMES_CALENDAR: string;
  TEE_TIMES_HISTORY: string;
  // Invites
  INVITES: string;
  INVITES_FROM_ROSTER: string;
  INVITES_PENDING: string;
  INVITES_SENT: string;
  // Friends
  FRIENDS: string;
  FRIENDS_REQUEST: string;
  FRIENDS_REQUESTS_PENDING: string;
  FRIENDS_REQUESTS_SENT: string;
  FRIENDS_DISCOVER: string;
  // Courses
  COURSES: string;
  COURSES_SEARCH: string;
  COURSES_NEARBY: string;
  COURSES_POPULAR: string;
  COURSES_FAVORITES: string;
  // Social Rate
  SOCIAL_RATE: string;
  SOCIAL_RATE_HISTORY: string;
  // Notifications
  NOTIFICATIONS: string;
  NOTIFICATIONS_UNREAD_COUNT: string;
  NOTIFICATIONS_READ_ALL: string;
  // Draft (QR Code)
  DRAFT_QR: string;
  DRAFT_QR_REGENERATE: string;
  DRAFT_SCAN: string;
  DRAFT_CONFIRM: string;
  DRAFT_HISTORY: string;
  // Health
  HEALTH: string;
}

/**
 * All API endpoints
 */
export const API_ENDPOINTS: ApiEndpoints = {
  // Auth
  REQUEST_OTP: `${API_URL}/auth/request-otp`,
  VERIFY_OTP: `${API_URL}/auth/verify-otp`,
  SET_PASSWORD: `${API_URL}/auth/set-password`,
  LOGIN: `${API_URL}/auth/login`,
  REFRESH_TOKEN: `${API_URL}/auth/refresh`,
  LOGOUT: `${API_URL}/auth/logout`,
  LOGOUT_ALL: `${API_URL}/auth/logout-all`,
  GET_CURRENT_USER: `${API_URL}/auth/me`,
  REQUEST_MAGIC_LINK: `${API_URL}/auth/magic-link`,
  VERIFY_MAGIC_LINK: `${API_URL}/auth/verify-magic`,
  REQUEST_SMS_MAGIC_LINK: `${API_URL}/auth/sms-magic-link`,
  REQUEST_SMS_MAGIC_LINK_LOGIN: `${API_URL}/auth/sms-magic-link-login`,
  VERIFY_SMS_MAGIC_LINK: `${API_URL}/auth/verify-sms-magic`,
  REGISTER: `${API_URL}/auth/register`,
  UPDATE_PROFILE: `${API_URL}/auth/profile`,
  GOOGLE_SIGNIN: `${API_URL}/auth/google`,
  // Roster
  ROSTER: `${API_URL}/api/roster`,
  ROSTER_ON_DECK: `${API_URL}/api/roster/on-deck`,
  ROSTER_SEARCH: `${API_URL}/api/roster/search`,
  ROSTER_REORDER: `${API_URL}/api/roster/reorder`,
  // Tee Times
  TEE_TIMES: `${API_URL}/api/tee-times`,
  TEE_TIMES_UPCOMING: `${API_URL}/api/tee-times/upcoming`,
  TEE_TIMES_CALENDAR: `${API_URL}/api/tee-times/calendar`,
  TEE_TIMES_HISTORY: `${API_URL}/api/tee-times/history`,
  // Invites
  INVITES: `${API_URL}/api/invites`,
  INVITES_FROM_ROSTER: `${API_URL}/api/invites/from-roster`,
  INVITES_PENDING: `${API_URL}/api/invites/pending`,
  INVITES_SENT: `${API_URL}/api/invites/sent`,
  // Friends
  FRIENDS: `${API_URL}/api/friends`,
  FRIENDS_REQUEST: `${API_URL}/api/friends/request`,
  FRIENDS_REQUESTS_PENDING: `${API_URL}/api/friends/requests/pending`,
  FRIENDS_REQUESTS_SENT: `${API_URL}/api/friends/requests/sent`,
  FRIENDS_DISCOVER: `${API_URL}/api/friends/discover`,
  // Courses
  COURSES: `${API_URL}/api/courses`,
  COURSES_SEARCH: `${API_URL}/api/courses/search`,
  COURSES_NEARBY: `${API_URL}/api/courses/nearby`,
  COURSES_POPULAR: `${API_URL}/api/courses/popular`,
  COURSES_FAVORITES: `${API_URL}/api/courses/favorites`,
  // Social Rate
  SOCIAL_RATE: `${API_URL}/api/social-rate`,
  SOCIAL_RATE_HISTORY: `${API_URL}/api/social-rate/history`,
  // Notifications
  NOTIFICATIONS: `${API_URL}/api/notifications`,
  NOTIFICATIONS_UNREAD_COUNT: `${API_URL}/api/notifications/unread-count`,
  NOTIFICATIONS_READ_ALL: `${API_URL}/api/notifications/read-all`,
  // Draft (QR Code)
  DRAFT_QR: `${API_URL}/api/draft/qr`,
  DRAFT_QR_REGENERATE: `${API_URL}/api/draft/qr/regenerate`,
  DRAFT_SCAN: `${API_URL}/api/draft/scan`,
  DRAFT_CONFIRM: `${API_URL}/api/draft/confirm`,
  DRAFT_HISTORY: `${API_URL}/api/draft/history`,
  // Health
  HEALTH: `${API_URL}/health`,
};
