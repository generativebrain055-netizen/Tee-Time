/**
 * OAuth Types
 * Type definitions for OAuth authentication flow
 */

// ============================================================================
// OAuth Provider Types
// ============================================================================

export type OAuthProvider = "google" | "apple";

// ============================================================================
// OAuth Response Types
// ============================================================================

/**
 * Standard OAuth response from backend
 */
export interface OAuthResponse {
  status: "authenticated";
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: OAuthUser;
  isNewUser: boolean;
  needsOnboarding: boolean;
  missingFields: OAuthMissingField[];
  profileIncomplete?: boolean;
  message?: string;
}

/**
 * OAuth user profile from backend
 */
export interface OAuthUser {
  id: string;
  phoneNumber: string | null;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  handicap: number | null;
  socialRate: number | null;
  location: string | null;
  homeCourse: string | null;
}

/**
 * Fields that may be missing from OAuth user profile
 */
export type OAuthMissingField =
  | "firstName"
  | "lastName"
  | "location"
  | "homeCourse"
  | "phoneNumber";

// ============================================================================
// OAuth Callback Types
// ============================================================================

/**
 * Data passed to OAuth success callback
 */
export interface OAuthSuccessData {
  isNewUser: boolean;
  needsOnboarding?: boolean;
  user?: OAuthUser;
  oauthData?: OAuthOnboardingData;
  /** @deprecated Use oauthData instead */
  partialData?: LegacyOAuthPartialData;
}

/**
 * Data for OAuth onboarding flow
 */
export interface OAuthOnboardingData {
  accessToken: string;
  refreshToken: string;
  user: OAuthUser;
  needsOnboarding: boolean;
  missingFields: OAuthMissingField[];
}

/**
 * @deprecated Legacy partial data format
 */
export interface LegacyOAuthPartialData {
  tempToken?: string;
  requiredFields?: string[];
  email?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  authProvider?: OAuthProvider;
}

// ============================================================================
// OAuth Button Props
// ============================================================================

/**
 * Props for OAuth buttons component
 */
export interface OAuthButtonsProps {
  onSuccess: (data: OAuthSuccessData) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

// ============================================================================
// OAuth Onboarding Types
// ============================================================================

/**
 * OAuth onboarding screen navigation props
 */
export interface OAuthOnboardingRouteParams {
  oauthData: OAuthOnboardingData;
}

/**
 * Steps in the OAuth onboarding flow
 */
export type OAuthOnboardingStep = "name" | "location" | "club" | "complete";

/**
 * Profile completion request payload
 */
export interface ProfileCompletionPayload {
  firstName?: string;
  lastName?: string;
  location?: string;
  homeCourse?: string;
  phoneNumber?: string;
  username?: string;
  handicap?: number;
}

/**
 * Profile completion response
 */
export interface ProfileCompletionResponse {
  success: boolean;
  user: OAuthUser;
  accessToken?: string;
  refreshToken?: string;
  needsOnboarding: boolean;
  missingFields: OAuthMissingField[];
  message: string;
}

// ============================================================================
// Google OAuth Types
// ============================================================================

export interface GoogleOAuthConfig {
  iosClientId: string;
  webClientId: string;
  scopes: string[];
  redirectUri?: string; // Optional explicit redirect URI for OAuth 2.0 compliance
}

// ============================================================================
// Apple OAuth Types
// ============================================================================

export interface AppleCredential {
  identityToken: string | null;
  fullName: {
    givenName: string | null;
    familyName: string | null;
  } | null;
  email: string | null;
}

export interface AppleSignInRequest {
  identityToken: string;
  user: {
    name: {
      firstName: string | null;
      lastName: string | null;
    };
  } | null;
}
