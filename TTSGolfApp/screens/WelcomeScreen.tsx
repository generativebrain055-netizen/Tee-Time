import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PrimaryButton, SecondaryButton } from "../components";
import { BannerAd } from "../components/BannerAd";

const WELCOME_TERMS_ACCEPTED_KEY = "@teetime_welcome_terms_privacy_accepted";

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

  const [showCombined, setShowCombined] = useState(false);

  /** Sign in: no terms modal — user already has an account. */
  const handleSignInPress = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

  /** Create account: show terms + privacy once per device, then onboarding. */
  const handleCreateAccountPress = useCallback(async () => {
    try {
      const accepted = await AsyncStorage.getItem(WELCOME_TERMS_ACCEPTED_KEY);
      if (accepted === "1") {
        navigation.navigate("Onboarding");
        return;
      }
    } catch {
      /* fall through to modal */
    }
    setShowCombined(true);
  }, [navigation]);

  const closeAllModals = useCallback(() => {
    setShowCombined(false);
  }, []);

  const handleCombinedAgree = useCallback(async () => {
    try {
      await AsyncStorage.setItem(WELCOME_TERMS_ACCEPTED_KEY, "1");
    } catch {
      /* still continue to onboarding */
    }
    closeAllModals();
    navigation.navigate("Onboarding");
  }, [closeAllModals, navigation]);

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
          <BannerAd slotKey="loading_screen" />
          <PrimaryButton
            title="Create account"
            onPress={handleCreateAccountPress}
            icon="arrow-forward"
          />

          <SecondaryButton
            title="Sign in"
            onPress={handleSignInPress}
          />

          <Text className="text-xs text-gray-400 text-center leading-[18px] mt-2">
            New accounts are asked once to accept our{" "}
            <Text className="underline text-gray-400">Terms of Service</Text>
            {" "}
            and <Text className="underline text-gray-400">Privacy Policy</Text>
            {"\n"}
            before onboarding. Sign in does not require this step.
          </Text>
        </Animated.View>
      </SafeAreaView>

      {/* Terms + Privacy — create account only; acceptance stored once per install */}
      <Modal
        visible={showCombined}
        transparent
        animationType="fade"
        onRequestClose={closeAllModals}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxHeight: "80%",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 12,
                color: "#111827",
              }}
            >
              Terms of Service and{"\n"}Privacy Policy
            </Text>
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator
            >
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>
                At Tee Time Social, we take your privacy seriously. This Privacy
                Policy explains how we collect, use, disclose, and safeguard
                your information when you use our mobile application.
                {"\n\n"}
                <Text style={{ fontWeight: "600" }}>Information We Collect</Text>{" "}
                - We collect information that you provide directly to us when
                you:
                {"\n\n"}• Create an account
                {"\n"}• Update your profile information
                {"\n"}• Schedule or join tee times
                {"\n"}• Communicate with other users through our chat feature
                {"\n"}• Contact our support team
                {"\n\n"}
                This information may include your name, email address, phone
                number, location, golf course preferences, availability
                schedule, and profile photo, as well as any other information
                you choose to provide.
                {"\n\n"}
                <Text style={{ fontWeight: "600" }}>Terms of Service</Text>
                {"\n"}
                By tapping “I agree”, you agree to Tee Time Social&apos;s Terms
                of Service, including how we handle messaging and invites.
                {"\n\n"}
                Message frequency varies. Authentication messages are sent once
                per login event. Invitation messages are sent only when you
                schedule or respond to tee times. Message and data rates may
                apply. To stop SMS from Tee Time Social, reply STOP to any
                message.
              </Text>
            </ScrollView>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <TouchableOpacity
                onPress={closeAllModals}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: "#F3F4F6",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 8,
                }}
              >
                <Text style={{ fontSize: 16, color: "#111827", fontWeight: "500" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCombinedAgree}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: "#22C55E",
                  justifyContent: "center",
                  alignItems: "center",
                  marginLeft: 8,
                }}
              >
                <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>
                  I agree
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
