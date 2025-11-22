import { Platform } from 'react-native';

// API Configuration
// Using your computer's IP for physical device testing
const API_BASE_URL = 'http://192.168.18.103:3000';

const getApiUrl = () => {
  return API_BASE_URL;
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
  REQUEST_OTP: `${API_URL}/auth/request-otp`,
  VERIFY_OTP: `${API_URL}/auth/verify-otp`,
  SET_PASSWORD: `${API_URL}/auth/set-password`,
  LOGIN: `${API_URL}/auth/login`,
  HEALTH: `${API_URL}/health`,
};
