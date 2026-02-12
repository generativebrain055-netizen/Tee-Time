/**
 * Login screen constants - now using design system tokens
 * @deprecated Import colors from design system instead: import { useColors } from '../../ui/theme'
 */

// Re-export from design system to maintain compatibility
import { colors } from '../../ui/theme/tokens';

export const LOGIN_COLORS = colors.light;

/** Phone sign-in uses magic link (SMS link), not OTP/code */
export type LoginStep = "phone" | "magicLinkSent";
