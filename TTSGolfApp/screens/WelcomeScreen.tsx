import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PrimaryButton, SecondaryButton } from "../components";

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

export default function WelcomeScreen({
  navigation,
}: WelcomeScreenProps): React.ReactElement {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonsSlideAnim = useRef(new Animated.Value(0)).current;
  const buttonsFadeAnim = useRef(new Animated.Value(1)).current;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 justify-between px-[8%] pb-6">
        <Animated.View
          className="flex-1 justify-center items-center pt-16"
          style={{
            opacity: fadeAnim,
            transform: [
              { translateY: slideUpAnim },
              { scale: logoScaleAnim },
            ],
          }}
        >
          <Text className="text-sm font-semibold text-gray-400 tracking-[2px] mb-6">WELCOME TO</Text>
          <Image
            source={require("../assets/compact-logo.png")}
            style={{ width: width * 0.7, height: 150 }}
            className="mb-4"
            resizeMode="contain"
          />
          <Text className="text-lg text-gray-500 font-medium">Golf scheduling made simple</Text>
        </Animated.View>

        <Animated.View
          className="pb-12 px-4 gap-3"
          style={{
            opacity: buttonsFadeAnim,
            transform: [{ translateY: buttonsSlideAnim }],
          }}
        >
          <PrimaryButton
            title="Create account"
            onPress={() => navigation.navigate("Onboarding")}
            icon="arrow-forward"
          />

          <SecondaryButton
            title="Sign in"
            onPress={() => navigation.navigate("Login")}
          />

          <Text className="text-xs text-gray-400 text-center leading-[18px] mt-2">
            Joining our app means you agree with our{" "}
            <Text className="underline text-gray-400">Terms of Service</Text>
            {"\n"}and <Text className="underline text-gray-400">Privacy Policy</Text>
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
