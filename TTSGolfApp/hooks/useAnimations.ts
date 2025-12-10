import { useRef, useEffect, useCallback } from "react";
import { Animated, Easing } from "react-native";

export type Direction = "up" | "down" | "left" | "right" | "bottom";

interface FadeConfig {
  duration?: number;
  delay?: number;
}

interface ScaleConfig {
  initialValue?: number;
  tension?: number;
  friction?: number;
}

interface SlideInResult {
  translateAnim: Animated.Value;
  fadeAnim: Animated.Value;
  getTransformStyle: () =>
    | { translateY: Animated.Value }
    | { translateX: Animated.Value };
}

interface PressAnimationResult {
  scaleAnim: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
}

interface FadeScaleResult {
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

/**
 * Hook for fade-in animation
 */
export const useFadeIn = (duration = 300, delay = 0): Animated.Value => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [fadeAnim, duration, delay]);

  return fadeAnim;
};

/**
 * Hook for scale animation (spring effect)
 */
export const useScaleSpring = (
  initialValue = 0.5,
  tension = 50,
  friction = 7
): Animated.Value => {
  const scaleAnim = useRef(new Animated.Value(initialValue)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension,
      friction,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, tension, friction]);

  return scaleAnim;
};

/**
 * Hook for combined fade + scale animation (great for splash screens)
 */
export const useFadeScale = (
  fadeConfig: FadeConfig = {},
  scaleConfig: ScaleConfig = {}
): FadeScaleResult => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(
    new Animated.Value(scaleConfig.initialValue || 0.3)
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeConfig.duration || 600,
        delay: fadeConfig.delay || 0,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: scaleConfig.tension || 50,
        friction: scaleConfig.friction || 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    fadeAnim,
    scaleAnim,
    fadeConfig.duration,
    fadeConfig.delay,
    scaleConfig.tension,
    scaleConfig.friction,
  ]);

  return { fadeAnim, scaleAnim };
};

/**
 * Hook for slide-in animation
 */
export const useSlideIn = (
  direction: Direction = "up",
  distance = 50,
  duration = 400,
  delay = 0
): SlideInResult => {
  const translateAnim = useRef(
    new Animated.Value(
      direction === "up" || direction === "left" ? distance : -distance
    )
  ).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: duration * 0.8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateAnim, fadeAnim, duration, delay]);

  const getTransformStyle = ():
    | { translateY: Animated.Value }
    | { translateX: Animated.Value } => {
    if (direction === "up" || direction === "down") {
      return { translateY: translateAnim };
    }
    return { translateX: translateAnim };
  };

  return { translateAnim, fadeAnim, getTransformStyle };
};

/**
 * Hook for staggered animations (for lists)
 */
export const useStaggeredAnimation = (
  itemCount: number,
  baseDelay = 50,
  duration = 300
): Animated.Value[] => {
  const animations = useRef(
    Array(itemCount)
      .fill(null)
      .map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const staggeredAnimations = animations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration,
        delay: index * baseDelay,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      })
    );
    Animated.stagger(baseDelay, staggeredAnimations).start();
  }, [animations, baseDelay, duration]);

  return animations;
};

/**
 * Hook for button press animation
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

/**
 * Hook for pulse animation (loading indicators, etc.)
 */
export const usePulse = (
  minScale = 0.95,
  maxScale = 1.05,
  duration = 1000
): Animated.Value => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: maxScale,
        duration: duration / 2,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.timing(pulseAnim, {
        toValue: minScale,
        duration: duration / 2,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
    ]);

    Animated.loop(pulse).start();

    return () => pulseAnim.stopAnimation();
  }, [pulseAnim, minScale, maxScale, duration]);

  return pulseAnim;
};

export default {
  useFadeIn,
  useScaleSpring,
  useFadeScale,
  useSlideIn,
  useStaggeredAnimation,
  usePressAnimation,
  usePulse,
};
