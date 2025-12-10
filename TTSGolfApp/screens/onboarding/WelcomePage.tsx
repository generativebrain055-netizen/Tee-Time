import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { borderRadius } from "../../theme";
import type { WelcomePageProps } from "../../types";

interface Styles {
  container: ViewStyle;
  content: ViewStyle;
  logoContainer: ViewStyle;
  logo: ImageStyle;
  titleContainer: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnText: TextStyle;
  secondaryBtn: ViewStyle;
  secondaryBtnText: TextStyle;
  termsText: TextStyle;
  linkText: TextStyle;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onGetStarted,
  onLogin,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/striplogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Welcome to TeeTime</Text>
          <Text style={styles.subtitle}>
            Find and book tee times at the best courses near you. Connect with
            golfers and improve your game.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onGetStarted}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onLogin}>
          <Text style={styles.secondaryBtnText}>
            Already have an account? Log in
          </Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our{" "}
          <Text style={styles.linkText}>Terms of Service</Text> and{" "}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  primaryBtn: {
    backgroundColor: "#5DB075",
    borderRadius: borderRadius.full,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  secondaryBtnText: {
    color: "#5DB075",
    fontSize: 16,
    fontWeight: "600",
  },
  termsText: {
    fontSize: 12,
    color: "#999999",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#5DB075",
  },
});
