/**
 * Animation Hooks
 * Reusable animation hooks for React Native components
 * Only includes hooks that are actively used in the app
 */

import { useRef, useCallback } from "react";
import { Animated } from "react-native";

// ============================================================================
// Types
// ============================================================================

interface PressAnimationResult {
  scaleAnim: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for button press animation
 * Used in: TTSGolfApp/components/Button.tsx
 */
export const usePressAnimation = (): PressAnimationResult => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return { scaleAnim, onPressIn, onPressOut };
};

export default {
  usePressAnimation,
};
