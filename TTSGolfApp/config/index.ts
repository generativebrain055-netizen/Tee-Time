/**
 * Config Index
 * Re-exports all configuration modules for cleaner imports
 */

// API Configuration
export { API_URL, API_ENDPOINTS } from "./api";
export type { ApiEndpoints } from "./api";

// Firebase exports are handled internally in firebase.ts
// Import directly from firebase.ts for Firebase functionality
