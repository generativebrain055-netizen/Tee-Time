import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PrimaryButton, SecondaryButton } from "../components";
import { colors, spacing, fontSize, fontWeight } from "../theme";

const { width } = Dimensions.get("window");

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

interface WelcomeScreenProps {
  navigation: Navigation;
}

interface Styles {
  container: ViewStyle;
  safeArea: ViewStyle;
  logoSection: ViewStyle;
  welcomeText: TextStyle;
  logo: ImageStyle;
  tagline: TextStyle;
  buttonsSection: ViewStyle;
  buttonSpacing: ViewStyle;
  termsText: TextStyle;
  termsLink: TextStyle;
}

export default function WelcomeScreen({
  navigation,
}: WelcomeScreenProps): React.ReactElement {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonsSlideAnim = useRef(new Animated.Value(0)).current;
  const buttonsFadeAnim = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
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
            onPress={() => navigation.navigate("Onboarding")}
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

const styles = StyleSheet.create<Styles>({
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
    fontWeight: fontWeight.semibold as TextStyle["fontWeight"],
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
    fontWeight: fontWeight.medium as TextStyle["fontWeight"],
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
    fontWeight: fontWeight.semibold as TextStyle["fontWeight"],
  },
});
