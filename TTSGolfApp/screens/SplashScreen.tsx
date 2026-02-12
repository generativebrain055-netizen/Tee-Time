import React, { useRef, useEffect } from "react";
import {
  View,
  Image,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

const { width, height } = Dimensions.get("window");

type ScreenName =
  | "Splash"
  | "Welcome"
  | "Login"
  | "Signup"
  | "Onboarding"
  | "AvailabilityOnboarding"
  | "HomePage"
  | "Home";

interface Navigation {
  navigate: (screen: ScreenName, params?: any) => void;
  replace: (screen: ScreenName, params?: any) => void;
}

interface SplashScreenProps {
  navigation: Navigation;
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

        logger.debug("[SplashScreen] Session check", {
          hasAccessToken: !!accessToken,
          hasUserStr: !!userStr,
          accessTokenPreview: accessToken ? accessToken.substring(0, 30) + "..." : null,
        });

        // Wait for animation to complete
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (accessToken && userStr) {
          // Validate token by checking if it's expired
          try {
            // Decode JWT to check expiration (simple check without verification)
            const tokenParts = accessToken.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const currentTime = Math.floor(Date.now() / 1000);

              logger.debug("[SplashScreen] Token validation", {
                expiration: payload.exp,
                currentTime,
                isExpired: payload.exp && payload.exp < currentTime,
              });

              // Check if token is expired
              if (payload.exp && payload.exp < currentTime) {
                // Token expired, clear storage and go to Welcome
                logger.info("[SplashScreen] Token expired, clearing session");
                await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
                navigation.replace("Welcome");
                return;
              }
            }

            // Token is valid, check if user still exists in database
            const user = JSON.parse(userStr);
            logger.debug("[SplashScreen] Valid session found, verifying user exists", {
              userId: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phoneNumber: user.phoneNumber,
            });
            
            // Verify user exists in database
            try {
              const { profileApi } = await import("../services/api/profileApi");
              const profileResponse = await profileApi.getCurrentUser();
              
              if (!profileResponse.success || !profileResponse.user) {
                // User doesn't exist in database, clear session
                logger.info("[SplashScreen] User not found in database, clearing session");
                await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
                navigation.replace("Welcome");
                return;
              }
              
              logger.debug("[SplashScreen] User verified, checking availability");
            } catch (userError: any) {
              // If 401/404, user doesn't exist
              if (userError.statusCode === 401 || userError.statusCode === 404) {
                logger.info("[SplashScreen] User not found (401/404), clearing session");
                await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
                navigation.replace("Welcome");
                return;
              }
              // Other errors, log but continue
              logger.error("[SplashScreen] Error verifying user", userError);
            }
            
            // Check availability
            try {
              const { availabilityApi } = await import("../services/api/availabilityApi");
              
              // Add timeout to prevent hanging
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Availability check timeout')), 3000)
              );
              
              const availabilityPromise = availabilityApi.getUserAvailability();
              
              const response = (await Promise.race([availabilityPromise, timeoutPromise])) as { data?: unknown };
              // If no availability set, show availability onboarding
              if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
                logger.info("[SplashScreen] No availability found, navigating to AvailabilityOnboarding");
                navigation.replace("AvailabilityOnboarding", { user });
              } else {
                logger.debug("[SplashScreen] Availability exists, navigating to Home");
                navigation.replace("Home", { user });
              }
            } catch (availError) {
              logger.error("[SplashScreen] Error checking availability", availError);
              // On error or timeout, just go to home (user can set availability later)
              navigation.replace("Home", { user });
            }
          } catch (tokenError) {
            // Invalid token format, clear and go to Welcome
            logger.error("[SplashScreen] Invalid token format", tokenError);
            await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
            navigation.replace("Welcome");
          }
        } else {
          // No session, go to Welcome
          navigation.replace("Welcome");
        }
      } catch (error) {
        logger.error("[SplashScreen] Session check error", error);
        // Clear any corrupted data and go to Welcome
        await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
        navigation.replace("Welcome");
      }
    };

    checkSession();
  }, [navigation, fadeAnim, scaleAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-5deg", "0deg"],
  });

  return (
    <View className="flex-1 bg-white justify-center items-center">
      <StatusBar style="dark" />
      <Animated.View
        className="items-center justify-center"
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { rotate: spin }],
        }}
      >
        <Image
          source={require("../assets/compact-logo.png")}
          style={{ width: width * 0.9, height: height * 0.25 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}
