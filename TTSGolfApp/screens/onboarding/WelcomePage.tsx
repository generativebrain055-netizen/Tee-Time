import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { WelcomePageProps } from "../../types";

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onGetStarted,
  onLogin,
}) => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <View className="flex-1 justify-center items-center px-10">
        <View className="mb-10">
          <Image
            source={require("../../assets/striplogo.png")}
            className="w-[150px] h-[150px]"
            resizeMode="contain"
          />
        </View>

        <View className="items-center">
          <Text className="text-[28px] font-bold text-black mb-4 text-center">Welcome to TeeTime</Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            Find and book tee times at the best courses near you. Connect with
            golfers and improve your game.
          </Text>
        </View>
      </View>

      <View className="p-5 pb-10">
        <TouchableOpacity className="bg-primary rounded-md py-[18px] items-center justify-center mb-4" onPress={onGetStarted}>
          <Text className="text-white text-base font-bold">Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity className="py-3 items-center mb-5" onPress={onLogin}>
          <Text className="text-primary text-base font-semibold">
            Already have an account? Log in
          </Text>
        </TouchableOpacity>

        <Text className="text-xs text-gray-400 text-center leading-[18px]">
          By tapping Get Started, you agree to our{" "}
          <Text className="text-primary">Terms of Service</Text> and{" "}
          <Text className="text-primary">Privacy Policy</Text>.{"\n"}
          Log in does not require accepting them again.
        </Text>
      </View>
    </SafeAreaView>
  );
};
