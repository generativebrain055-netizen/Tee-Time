import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { OnboardingData } from "../../types";

interface MagicLinkPageProps {
  onNext: (data: Partial<OnboardingData>) => void;
  onBack?: () => void;
  initialPhone?: string;
}

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  progressBarContainer: ViewStyle;
  progressBarFill: ViewStyle;
  content: ViewStyle;
  iconContainer: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  successIcon: ViewStyle;
  checkmark: ViewStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnText: TextStyle;
  phoneText: TextStyle;
}

export const MagicLinkPage: React.FC<MagicLinkPageProps> = ({
  onNext,
  onBack,
  initialPhone,
}) => {
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Simulate magic link verification - auto-authenticate after 1.5 seconds
    const timer = setTimeout(() => {
      setIsVerifying(false);
      setIsAuthenticated(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = (): void => {
    onNext({ magicLinkVerified: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: "15%" }]} />
        </View>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {isVerifying ? (
          <>
            <View style={styles.iconContainer}>
              <ActivityIndicator size="large" color="#5DB075" />
            </View>
            <Text style={styles.title}>Verifying...</Text>
            <Text style={styles.subtitle}>
              Authenticating your phone number
            </Text>
            {initialPhone && (
              <Text style={styles.phoneText}>{initialPhone}</Text>
            )}
          </>
        ) : isAuthenticated ? (
          <>
            <View style={styles.successIcon}>
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={50} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.title}>Authenticated! ✓</Text>
            <Text style={styles.subtitle}>
              Your phone number has been verified successfully
            </Text>
            {initialPhone && (
              <Text style={styles.phoneText}>{initialPhone}</Text>
            )}
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, { opacity: isAuthenticated ? 1 : 0.5 }]}
          onPress={handleContinue}
          disabled={!isAuthenticated}
        >
          <Text style={styles.primaryBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    marginHorizontal: 20,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#5DB075",
    borderRadius: 2,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F9F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#5DB075",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  checkmark: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  phoneText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5DB075",
    marginTop: 15,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 15,
  },
  primaryBtn: {
    backgroundColor: "#5DB075",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
