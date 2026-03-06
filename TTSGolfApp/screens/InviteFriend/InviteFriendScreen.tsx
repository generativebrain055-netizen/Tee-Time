import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Phone, X } from "lucide-react-native";
import { ScreenShell } from "../../ui/layout";
import { friendApi } from "../../services/api";
import { palette, spacing, fontSize, radii } from "../../ui/theme/tokens";
import { logger } from "../../utils/logger";

const PLACEHOLDER = "(555) 123-4567";

/** Format as (XXX) XXX-XXXX, max 10 digits */
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Extract 10 digits for API (E.164 is applied on backend or in apiCall) */
function toE164(display: string): string | undefined {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 10) return undefined;
  return `+1${digits}`;
}

interface Props {
  navigation: any;
}

export default function InviteFriendScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [sending, setSending] = useState(false);

  const digitsOnly = phoneDisplay.replace(/\D/g, "");
  const isValid = digitsOnly.length === 10;

  const handleChange = useCallback((text: string) => {
    setPhoneDisplay(formatPhoneInput(text));
  }, []);

  const handleClear = useCallback(() => {
    setPhoneDisplay("");
  }, []);

  const handleSend = useCallback(async () => {
    const e164 = toE164(phoneDisplay);
    if (!e164) return;
    setSending(true);
    try {
      const res = await friendApi.sendInviteByPhone(e164);
      if (res.success) {
        navigation.replace("InviteSent");
      } else {
        Alert.alert("Error", res.message || "Failed to send invite");
      }
    } catch (err: any) {
      logger.error("[InviteFriend] sendInviteByPhone error", err);
      Alert.alert("Error", err?.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  }, [phoneDisplay, navigation]);

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={palette.gray900} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Phone size={32} color={palette.green500} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Invite a friend</Text>
          <Text style={styles.description}>
            We'll send them an invite to join the app. Once they sign up, you'll be connected as friends.
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={phoneDisplay}
              onChangeText={handleChange}
              placeholder={PLACEHOLDER}
              placeholderTextColor={palette.gray400}
              keyboardType="phone-pad"
              maxLength={14}
              editable={!sending}
            />
            {phoneDisplay.length > 0 && (
              <TouchableOpacity
                onPress={handleClear}
                style={styles.clearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={palette.gray500} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={[styles.primaryButton, !isValid && styles.primaryButtonDisabled]}
            onPress={handleSend}
            disabled={!isValid || sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Send invite</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.green100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: palette.gray900,
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: palette.gray500,
    lineHeight: 22,
    marginBottom: spacing["2xl"],
  },
  inputWrap: {
    position: "relative",
    alignSelf: "stretch",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    color: palette.gray900,
  },
  clearBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
  },
  primaryButton: {
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: palette.green500,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: palette.white,
  },
});
