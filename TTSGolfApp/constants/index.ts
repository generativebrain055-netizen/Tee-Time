/**
 * Constants Index
 * Re-exports all constants for cleaner imports
 */

// Colors (legacy - prefer theme/tokens.ts for new code)
export { COLORS } from "./colors";

// Onboarding constants
export {
  ONBOARDING_STEPS,
  STEP_ORDER,
  TIME_OF_DAY_OPTIONS,
  PLAYER_COUNT_OPTIONS,
  PLAY_STYLE_OPTIONS,
  MAGIC_LINK_RESEND_DELAY,
  MAGIC_LINK_EXPIRY,
} from "./onboarding";

export type {
  OnboardingStep,
  TimeOfDayOption,
  PlayerCountOption,
  PlayStyleOption,
} from "./onboarding";
