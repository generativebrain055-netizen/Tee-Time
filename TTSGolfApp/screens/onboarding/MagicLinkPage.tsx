import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import type { OnboardingData } from "../../types";
import {
  requestSmsMagicLink,
  verifySmsMagicLink,
  maskPhoneDisplay,
} from "../../utils/smsMagicLink";

const COLORS = {
  primary: "#5EBC68",
  primaryLight: "#D5FBE2",
  white: "#FFFFFF",
  black: "#000000",
  textMain: "#1A1A1A",
  textSub: "#666666",
  error: "#EF4444",
};

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
  successIcon: ViewStyle;
  checkmark: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  phoneText: TextStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnText: TextStyle;
  errorText: TextStyle;
}

export const MagicLinkPage: React.FC<MagicLinkPageProps> = ({
  onNext,
  onBack,
  initialPhone,
}) => {
  const [isSending, setIsSending] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const maskedPhone = initialPhone ? maskPhoneDisplay(initialPhone) : "";

  const handleMagicLinkUrl = useCallback(
    async (url: string) => {
      try {
        const parsed = Linking.parse(url);
        const tokenRaw = parsed.queryParams?.token;
        const token =
          typeof tokenRaw === "string"
            ? tokenRaw
            : Array.isArray(tokenRaw)
              ? tokenRaw[0]
              : null;
        if (!token || typeof token !== "string") return;

        setIsVerifying(true);
        const result = await verifySmsMagicLink(token);
        setIsVerifying(false);

        if (result.success) {
          setIsAuthenticated(true);
        } else {
          Alert.alert("Verification Failed", result.error || "Please try again.");
        }
      } catch (err) {
        setIsVerifying(false);
        Alert.alert("Verification Failed", "Please try again.");
      }
    },
    []
  );

  // Send verification link on mount
  useEffect(() => {
    if (!initialPhone) {
      setIsSending(false);
      setSendError("No phone number provided.");
      return;
    }

    requestSmsMagicLink(initialPhone).then((result) => {
      setIsSending(false);
      if (!result.success) {
        setSendError(result.error || "Failed to send verification link.");
      }
    });
  }, [initialPhone]);

  // Listen for deep link (app in foreground/background)
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.includes("auth/magic-link") && url.includes("token=")) {
        handleMagicLinkUrl(url);
      }
    });

    return () => subscription.remove();
  }, [handleMagicLinkUrl]);

  // Handle app opened from closed state via deep link
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url && url.includes("auth/magic-link") && url.includes("token=")) {
        handleMagicLinkUrl(url);
      }
    });
  }, [handleMagicLinkUrl]);

  const handleContinue = (): void => {
    onNext({ magicLinkVerified: true });
  };

  const handleResend = async (): Promise<void> => {
    if (!initialPhone || isSending) return;
    setIsSending(true);
    setSendError(null);
    const result = await requestSmsMagicLink(initialPhone);
    setIsSending(false);
    if (!result.success) {
      setSendError(result.error || "Failed to send.");
    }
  };

  const showSuccess = isAuthenticated;
  const showSpinner = isSending || isVerifying;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: "15%" }]} />
        </View>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {showSpinner && !showSuccess ? (
          <>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.primaryLight }]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
            <Text style={styles.title}>
              {isSending ? "Sending verification link..." : "Verifying..."}
            </Text>
            <Text style={styles.subtitle}>
              {isSending
                ? "We're sending a verification link to your phone"
                : "Authenticating your phone number"}
            </Text>
          </>
        ) : showSuccess ? (
          <>
            <View style={[styles.successIcon, { backgroundColor: COLORS.primaryLight }]}>
              <View style={[styles.checkmark, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="checkmark" size={50} color={COLORS.white} />
              </View>
            </View>
            <Text style={styles.title}>Verification complete</Text>
            <Text style={styles.subtitle}>
              Your phone number has been verified successfully
            </Text>
          </>
        ) : (
          <>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="mail-open-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Check your messages</Text>
            <Text style={styles.subtitle}>
              We've sent a verification link to{"\n"}
              <Text style={styles.phoneText}>{maskedPhone}</Text>
              {"\n\n"}Tap the link in your SMS to verify your phone number.
            </Text>
            {sendError && <Text style={styles.errorText}>{sendError}</Text>}
            <TouchableOpacity
              onPress={handleResend}
              disabled={isSending}
              style={{ marginTop: 24 }}
            >
              <Text style={[styles.phoneText, { fontSize: 14 }]}>
                Didn't receive it? Resend link
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { opacity: showSuccess ? 1 : 0.5 },
          ]}
          onPress={handleContinue}
          disabled={!showSuccess}
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
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.primary,
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  checkmark: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSub,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  phoneText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 15,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: 16,
    textAlign: "center",
  },
});
