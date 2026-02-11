/**
 * Moti Animation Presets & Utilities
 *
 * Rules:
 * - moti (MotiView, MotiText, AnimatePresence) for ALL enter/exit animations
 * - react-native-reanimated ONLY for gesture-driven or shared-value perf work
 * - All durations ≤ 300 ms unless explicitly overridden
 */

// ---------------------------------------------------------------------------
// Transition presets
// ---------------------------------------------------------------------------

export const transitions = {
  /** Snappy spring for most UI (≈200ms settle) */
  snappy: {
    type: "timing" as const,
    duration: 200,
  },
  /** Standard ease for content (≈250ms) */
  standard: {
    type: "timing" as const,
    duration: 250,
  },
  /** Fluid spring – buttons, cards popping in */
  spring: {
    type: "spring" as const,
    damping: 18,
    stiffness: 200,
    mass: 0.8,
  },
  /** Gentle spring – modals, large views */
  gentle: {
    type: "spring" as const,
    damping: 22,
    stiffness: 150,
    mass: 1,
  },
  /** Quick micro-interaction */
  micro: {
    type: "timing" as const,
    duration: 120,
  },
};

// ---------------------------------------------------------------------------
// Enter / Exit animation presets (use with MotiView)
// ---------------------------------------------------------------------------

/** Fade-in from transparent */
export const fadeIn = {
  from: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: transitions.snappy,
};

/** Fade-in + slide up 16px */
export const fadeInUp = {
  from: { opacity: 0, translateY: 16 },
  animate: { opacity: 1, translateY: 0 },
  exit: { opacity: 0, translateY: 8 },
  transition: transitions.standard,
};

/** Fade-in + slide down 16px */
export const fadeInDown = {
  from: { opacity: 0, translateY: -16 },
  animate: { opacity: 1, translateY: 0 },
  exit: { opacity: 0, translateY: -8 },
  transition: transitions.standard,
};

/** Fade-in + slide from left */
export const fadeInLeft = {
  from: { opacity: 0, translateX: -20 },
  animate: { opacity: 1, translateX: 0 },
  exit: { opacity: 0, translateX: -12 },
  transition: transitions.standard,
};

/** Fade-in + slide from right */
export const fadeInRight = {
  from: { opacity: 0, translateX: 20 },
  animate: { opacity: 1, translateX: 0 },
  exit: { opacity: 0, translateX: 12 },
  transition: transitions.standard,
};

/** Scale-in from 0.85 */
export const scaleIn = {
  from: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: transitions.spring,
};

/** Zoom + bounce for splash/logo entry */
export const zoomBounce = {
  from: { opacity: 0, scale: 0.3 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.6 },
  transition: {
    type: "spring" as const,
    damping: 12,
    stiffness: 180,
    mass: 0.7,
  },
};

/** Stagger helper – returns delay based on index (50ms spacing) */
export const stagger = (index: number, base = 50) => ({
  delay: index * base,
});

/** Combine a preset with stagger delay */
export const withDelay = <T extends Record<string, any>>(
  preset: T,
  delayMs: number
): T & { transition: any } => ({
  ...preset,
  transition: {
    ...(preset as any).transition,
    delay: delayMs,
  },
});

// ---------------------------------------------------------------------------
// Press / interaction state presets
// ---------------------------------------------------------------------------

/** Subtle press-down scale for touchable items */
export const pressScale = {
  animate: ({ pressed }: { pressed: boolean }) => {
    "worklet";
    return {
      scale: pressed ? 0.97 : 1,
    };
  },
  transition: transitions.micro,
};

// ---------------------------------------------------------------------------
// List-item stagger factory
// ---------------------------------------------------------------------------

/**
 * Returns moti props for an item at `index` within a staggered list.
 * Usage: `<MotiView {...listItemAnim(index)} />`
 */
export const listItemAnim = (index: number) => ({
  from: { opacity: 0, translateY: 12 },
  animate: { opacity: 1, translateY: 0 },
  transition: {
    ...transitions.standard,
    delay: index * 60,
  },
});

export default {
  transitions,
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  zoomBounce,
  stagger,
  withDelay,
  pressScale,
  listItemAnim,
};
