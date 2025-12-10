import { useRef, useEffect, useCallback } from "react";
import { Animated, Easing } from "react-native";

/**
 * Hook for fade-in animation
 */
export const useFadeIn = (duration = 300, delay = 0) => {
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
) => {
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
export const useFadeScale = (fadeConfig = {}, scaleConfig = {}) => {
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
  }, []);

  return { fadeAnim, scaleAnim };
};

/**
 * Hook for slide-in animation
 */
export const useSlideIn = (
  direction = "up",
  distance = 50,
  duration = 400,
  delay = 0
) => {
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
  }, []);

  const getTransformStyle = () => {
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
  itemCount,
  baseDelay = 50,
  duration = 300
) => {
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
  }, []);

  return animations;
};

/**
 * Hook for button press animation
 */
export const usePressAnimation = () => {
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
export const usePulse = (minScale = 0.95, maxScale = 1.05, duration = 1000) => {
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
  }, []);

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
