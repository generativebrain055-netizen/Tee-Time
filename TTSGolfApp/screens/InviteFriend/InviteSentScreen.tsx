import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { ScreenShell } from "../../ui/layout";
import { palette, spacing, fontSize, radii } from "../../ui/theme/tokens";

interface Props {
  navigation: any;
}

export default function InviteSentScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScreenShell>
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Check size={48} color={palette.white} strokeWidth={3} />
          </View>
          <Text style={styles.title}>Your invite was sent</Text>
          <Text style={styles.description}>
            We'll let you know when they join and you're connected as friends.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
    paddingHorizontal: spacing["2xl"],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: palette.green500,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: palette.gray900,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: palette.gray500,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 280,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
  primaryButton: {
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: palette.green500,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: palette.white,
  },
});
