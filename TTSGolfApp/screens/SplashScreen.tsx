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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme";
import { base64DecodeJSON } from "../utils/base64";

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

    // Check for existing session and navigate accordingly
    const checkSession = async () => {
      try {
        const [accessToken, userStr] = await Promise.all([
          AsyncStorage.getItem("accessToken"),
          AsyncStorage.getItem("user"),
        ]);

        // Wait for animation to complete
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (accessToken && userStr) {
          // Validate token by checking if it's expired
          try {
            // Decode JWT to check expiration (simple check without verification)
            const tokenParts = accessToken.split('.');
            if (tokenParts.length === 3) {
              const payload = base64DecodeJSON(tokenParts[1]);
              const currentTime = Math.floor(Date.now() / 1000);

              // Check if token is expired
              if (payload.exp && payload.exp < currentTime) {
                // Token expired, clear storage and go to Welcome
                console.log("Token expired, clearing session");
                await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
                navigation.replace("Welcome");
                return;
              }
            }

            // Token is valid, go to Home
            let user;
            try {
              user = JSON.parse(userStr);
            } catch (parseError) {
              console.error("Failed to parse user data:", parseError);
              // Clear corrupted user data
              await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
              navigation.replace("Welcome");
              return;
            }
            navigation.replace("Home", { user });
          } catch (tokenError) {
            // Invalid token format, clear and go to Welcome
            console.error("Invalid token format:", tokenError);
            await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
            navigation.replace("Welcome");
          }
        } else {
          // No session, go to Welcome
          navigation.replace("Welcome");
        }
      } catch (error) {
        console.error("Session check error:", error);
        // Clear any corrupted data and go to Welcome
        await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
        navigation.replace("Welcome");
      }
    };

    // Critical: .catch() prevents unhandled promise rejection which crashes the app in production
    checkSession().catch((err) => {
      console.error("Splash checkSession unhandled error:", err);
      try {
        AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]).catch(() => {});
        navigation.replace("Welcome");
      } catch (e) {
        // Last resort: navigation might throw
        navigation.replace("Welcome");
      }
    });
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
