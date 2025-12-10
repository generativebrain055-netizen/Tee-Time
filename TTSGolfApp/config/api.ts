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
  HEALTH: string;
}

/**
 * All API endpoints
 */
export const API_ENDPOINTS: ApiEndpoints = {
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
  HEALTH: `${API_URL}/health`,
};
