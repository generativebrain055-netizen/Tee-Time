/**
 * Motion Presets — token-first Moti animation primitives.
 *
 * RULES:
 * - moti (MotiView, MotiText, AnimatePresence) for ALL enter/exit animations
 * - react-native-reanimated ONLY for gesture-driven or shared-value perf work
 * - All durations/delays derive from animation tokens
 * - No animation logic inside screens — use these presets
 */
import { animation } from '../theme/tokens';

const { duration } = animation;

// ---------------------------------------------------------------------------
// Transition presets
// ---------------------------------------------------------------------------

export const transitions = {
  /** Snappy for quick feedback (~150ms) */
  snappy: { type: 'timing' as const, duration: duration.fast },
  /** Standard ease for content (~250ms) */
  standard: { type: 'timing' as const, duration: duration.normal },
  /** Micro-interaction (~100ms) */
  micro: { type: 'timing' as const, duration: duration.instant },
  /** Slow for dramatic reveals (~400ms) */
  slow: { type: 'timing' as const, duration: duration.slow },
  /** Fluid spring — buttons, cards */
  spring: animation.spring.snappy,
  /** Gentle spring — modals, large views */
  gentle: animation.spring.gentle,
  /** Bouncy spring — splash logo */
  bouncy: animation.spring.bouncy,
} as const;

// ---------------------------------------------------------------------------
// Enter / Exit presets (use spread with MotiView)
// ---------------------------------------------------------------------------

export const fadeIn = {
  from: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: transitions.snappy,
};

export const fadeInUp = {
  from: { opacity: 0, translateY: 16 },
  animate: { opacity: 1, translateY: 0 },
  exit: { opacity: 0, translateY: 8 },
  transition: transitions.standard,
};

export const fadeInDown = {
  from: { opacity: 0, translateY: -16 },
  animate: { opacity: 1, translateY: 0 },
  exit: { opacity: 0, translateY: -8 },
  transition: transitions.standard,
};

export const fadeInLeft = {
  from: { opacity: 0, translateX: -20 },
  animate: { opacity: 1, translateX: 0 },
  exit: { opacity: 0, translateX: -12 },
  transition: transitions.standard,
};

export const fadeInRight = {
  from: { opacity: 0, translateX: 20 },
  animate: { opacity: 1, translateX: 0 },
  exit: { opacity: 0, translateX: 12 },
  transition: transitions.standard,
};

export const scaleIn = {
  from: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: transitions.spring,
};

export const zoomBounce = {
  from: { opacity: 0, scale: 0.3 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.6 },
  transition: transitions.bouncy,
};

// ---------------------------------------------------------------------------
// Stagger helpers
// ---------------------------------------------------------------------------

/** Returns delay for a staggered item at `index`. */
export const staggerDelay = (index: number, baseMs = animation.stagger.itemDelay) => ({
  delay: Math.min(index, animation.stagger.maxItems) * baseMs,
});

/** Returns full moti props for a list item at `index`. */
export const listItemAnim = (index: number) => ({
  from: { opacity: 0, translateY: 12 },
  animate: { opacity: 1, translateY: 0 },
  transition: {
    ...transitions.standard,
    ...staggerDelay(index),
  },
});

/** Combine a preset with extra delay. */
export function withDelay<T extends Record<string, unknown>>(
  preset: T,
  delayMs: number,
): T {
  return {
    ...preset,
    transition: {
      ...(preset as any).transition,
      delay: delayMs,
    },
  };
}

// ---------------------------------------------------------------------------
// Press / interaction
// ---------------------------------------------------------------------------

/** Subtle press-down scale for touchable items. */
export const pressScale = {
  animate: ({ pressed }: { pressed: boolean }) => {
    'worklet';
    return { scale: pressed ? 0.97 : 1 };
  },
  transition: transitions.micro,
};
