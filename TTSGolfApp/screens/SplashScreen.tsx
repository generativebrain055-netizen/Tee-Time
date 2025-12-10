import React, { useRef, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  ViewStyle,
  ImageStyle,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "../theme";

const { width, height } = Dimensions.get("window");

type ScreenName =
  | "Splash"
  | "Welcome"
  | "Login"
  | "Signup"
  | "Onboarding"
  | "HomePage"
  | "Home";

interface Navigation {
  navigate: (screen: ScreenName, params?: any) => void;
  replace: (screen: ScreenName, params?: any) => void;
}

interface SplashScreenProps {
  navigation: Navigation;
}

interface Styles {
  container: ViewStyle;
  logoContainer: ViewStyle;
  logo: ImageStyle;
}

export default function SplashScreen({
  navigation,
}: SplashScreenProps): React.ReactElement {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Complex entrance animation
    Animated.parallel([
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      // Scale with spring
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
      // Subtle rotation
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
    ]).start();

    // Auto-navigate to Welcome screen after 1.5 seconds
    const timer = setTimeout(() => {
      navigation.replace("Welcome");
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, scaleAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-5deg", "0deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { rotate: spin }],
          },
        ]}
      >
        <Image
          source={require("../assets/compact-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: width * 0.9,
    height: height * 0.25,
  },
});
