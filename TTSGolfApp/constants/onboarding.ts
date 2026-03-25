/**
 * Onboarding Flow Constants
 * TypeScript version with proper typing
 */

/**
 * Onboarding step identifiers
 * Signup uses magic link via SMS - mock auth for now
 */
export const ONBOARDING_STEPS = {
  WELCOME: "welcome",
  SIGNUP_OPTIONS: "signup_options",
  PHONE: "phone",
  MAGIC_LINK: "magic_link",
  NAME: "name",
  EMAIL: "email",
  PROFILE_IMAGE: "profile_image",
  PHOTO_ZIP: "photo_zip",
  ZIP_CODE: "zip_code",
  LOCATION: "location",
  CLUB: "club",
  HANDICAP: "handicap",
  PREFERENCES: "preferences",
  SSO_CREATE_ACCOUNT: "sso_create_account", // Create your account (name, email, phone, Finish setup) – SSO only
  COMPLETE: "complete",
} as const;

/**
 * Type for onboarding step values
 */
export type OnboardingStep =
  (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

/**
 * Order of steps in the onboarding flow (phone signup).
 * After email: photo upload (url-1 151-297) → zip code (url-2 703-448) → next (url-3 151-325).
 * Photo and zip are separate screens; no combined photo+zip step.
 */
export const STEP_ORDER: OnboardingStep[] = [
  ONBOARDING_STEPS.SIGNUP_OPTIONS,
  ONBOARDING_STEPS.MAGIC_LINK,
  ONBOARDING_STEPS.NAME,
  ONBOARDING_STEPS.EMAIL,
  ONBOARDING_STEPS.PROFILE_IMAGE,
  ONBOARDING_STEPS.LOCATION,
  ONBOARDING_STEPS.CLUB,
  ONBOARDING_STEPS.HANDICAP,
  ONBOARDING_STEPS.PREFERENCES,
];

/**
 * Time of day option interface
 */
export interface TimeOfDayOption {
  label: string;
  value: string;
}

/**
 * Available time of day options for preferences
 */
export const TIME_OF_DAY_OPTIONS: TimeOfDayOption[] = [
  { label: "Early Morning (6-8 AM)", value: "early_morning" },
  { label: "Late Morning (8-11 AM)", value: "late_morning" },
  { label: "Afternoon (11 AM-3 PM)", value: "afternoon" },
  { label: "Late Afternoon (3-6 PM)", value: "late_afternoon" },
  { label: "Evening (After 6 PM)", value: "evening" },
];

/**
 * Player count option interface
 */
export interface PlayerCountOption {
  label: string;
  value: number;
}

/**
 * Available player count options
 */
export const PLAYER_COUNT_OPTIONS: PlayerCountOption[] = [
  { label: "Solo (1 player)", value: 1 },
  { label: "Twosome (2 players)", value: 2 },
  { label: "Threesome (3 players)", value: 3 },
  { label: "Foursome (4 players)", value: 4 },
];

/**
 * Play style option interface
 */
export interface PlayStyleOption {
  label: string;
  value: string;
  icon: string;
  description: string;
}

/**
 * Available play style options
 */
export const PLAY_STYLE_OPTIONS: PlayStyleOption[] = [
  {
    label: "Walk",
    value: "walk",
    icon: "walk",
    description: "I prefer to walk the course",
  },
  {
    label: "Ride",
    value: "ride",
    icon: "car-sport",
    description: "I prefer to use a golf cart",
  },
  {
    label: "Either",
    value: "either",
    icon: "git-compare",
    description: "I'm flexible with either option",
  },
];

/**
 * Magic link timing constants (in seconds)
 */
export const MAGIC_LINK_RESEND_DELAY: number = 30; // seconds
export const MAGIC_LINK_EXPIRY: number = 600; // 10 minutes in seconds
