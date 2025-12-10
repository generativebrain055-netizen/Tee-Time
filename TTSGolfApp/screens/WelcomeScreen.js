import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PrimaryButton, SecondaryButton } from "../components";
import { colors, spacing, borderRadius, fontSize, fontWeight } from "../theme";

const { width } = Dimensions.get("window");

export default function WelcomeScreen({ navigation }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonsSlideAnim = useRef(new Animated.Value(100)).current;
  const buttonsFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      // First: Logo and welcome text
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
      // Then: Buttons slide up
      Animated.parallel([
        Animated.timing(buttonsFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(buttonsSlideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideUpAnim },
                { scale: logoScaleAnim },
              ],
            },
          ]}
        >
          <Text style={styles.welcomeText}>WELCOME TO</Text>
          <Image
            source={require("../assets/compact-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Golf scheduling made simple</Text>
        </Animated.View>

        {/* Buttons Section */}
        <Animated.View
          style={[
            styles.buttonsSection,
            {
              opacity: buttonsFadeAnim,
              transform: [{ translateY: buttonsSlideAnim }],
            },
          ]}
        >
          <PrimaryButton
            title="Create account"
            onPress={() => navigation.navigate("Signup")}
            icon="arrow-forward"
            style={styles.buttonSpacing}
          />

          <SecondaryButton
            title="Sign in"
            onPress={() => navigation.navigate("Login")}
            style={styles.buttonSpacing}
          />

          <Text style={styles.termsText}>
            Joining our app means you agree with our{" "}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {"\n"}and <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: width * 0.08,
    paddingBottom: spacing.xl,
  },
  logoSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing.massive,
  },
  welcomeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: spacing.xl,
  },
  logo: {
    width: width * 0.7,
    height: 150,
    marginBottom: spacing.lg,
  },
  tagline: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  buttonsSection: {
    paddingBottom: spacing.huge,
    paddingHorizontal: spacing.md,
  },
  buttonSpacing: {
    marginBottom: spacing.md,
  },
  termsText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 16,
    marginTop: spacing.md,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
