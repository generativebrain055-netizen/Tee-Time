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
 * OAuth response for existing users (fully authenticated)
 */
export interface OAuthAuthenticatedResponse {
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
  providerData?: OAuthProviderData;
}

/**
 * OAuth response for new users (pending phone verification)
 */
export interface OAuthPendingResponse {
  status: "pending_phone_verification";
  success: boolean;
  needsPhoneVerification: true;
  providerData: OAuthProviderData;
  message?: string;
}

/**
 * Union type for all OAuth responses
 */
export type OAuthResponse = OAuthAuthenticatedResponse | OAuthPendingResponse;

/**
 * Standard OAuth response from backend (legacy - for backward compatibility)
 */
export interface OAuthLegacyResponse {
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
  providerData?: OAuthProviderData; // OAuth metadata (picture, locale, etc)
}

/**
 * OAuth provider metadata (Google, Apple, etc)
 */
export interface OAuthProviderData {
  name?: string;
  picture?: string | null;
  email?: string | null;
  email_verified?: boolean;
  is_private_email?: boolean;
  locale?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
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
  avatarUrl?: string | null; // Profile picture URL
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
  status?: "pending_phone_verification" | "authenticated";
  isNewUser: boolean;
  needsOnboarding?: boolean;
  needsPhoneVerification?: boolean;
  user?: OAuthUser;
  oauthData?: OAuthOnboardingData;
  providerData?: OAuthProviderData;
}

/**
 * Data for OAuth onboarding flow (authenticated users)
 */
export interface OAuthAuthenticatedOnboardingData {
  accessToken: string;
  refreshToken: string;
  user: OAuthUser;
  needsOnboarding: boolean;
  missingFields: OAuthMissingField[];
  providerData?: OAuthProviderData; // OAuth metadata for pre-filling forms
  needsPhoneVerification?: false;
}

/**
 * Data for OAuth onboarding flow (pending phone verification)
 */
export interface OAuthPendingOnboardingData {
  providerData: OAuthProviderData;
  needsPhoneVerification: true;
}

/**
 * Combined OAuth onboarding data type
 */
export type OAuthOnboardingData = OAuthAuthenticatedOnboardingData | OAuthPendingOnboardingData;

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
