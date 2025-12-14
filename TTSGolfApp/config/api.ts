/**
 * API Configuration
 * TypeScript version with proper typing
 */

// Using your computer's IP for physical device testing
const API_BASE_URL: string = "http://192.168.18.103:3000";

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
  VERIFY_SMS_MAGIC_LINK: string;
  REGISTER: string;
  UPDATE_PROFILE: string;
  // Roster
  ROSTER: string;
  ROSTER_ON_DECK: string;
  ROSTER_SEARCH: string;
  ROSTER_REORDER: string;
  // Tee Times
  TEE_TIMES: string;
  TEE_TIMES_UPCOMING: string;
  TEE_TIMES_CALENDAR: string;
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
  VERIFY_SMS_MAGIC_LINK: `${API_URL}/auth/verify-sms-magic`,
  REGISTER: `${API_URL}/auth/register`,
  UPDATE_PROFILE: `${API_URL}/auth/profile`,
  // Roster
  ROSTER: `${API_URL}/api/roster`,
  ROSTER_ON_DECK: `${API_URL}/api/roster/on-deck`,
  ROSTER_SEARCH: `${API_URL}/api/roster/search`,
  ROSTER_REORDER: `${API_URL}/api/roster/reorder`,
  // Tee Times
  TEE_TIMES: `${API_URL}/api/tee-times`,
  TEE_TIMES_UPCOMING: `${API_URL}/api/tee-times/upcoming`,
  TEE_TIMES_CALENDAR: `${API_URL}/api/tee-times/calendar`,
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
  // Health
  HEALTH: `${API_URL}/health`,
};
