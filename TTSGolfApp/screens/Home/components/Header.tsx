import React, { memo, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Bell, Search } from "lucide-react-native";
import { MotiView } from "moti";
import { notificationApi } from "../../../services/api";
import { transitions } from "../../../theme/animations";
import { colorTokens } from "../../../theme/tokens";
import { spacing, fontSize, radii } from "../../../ui/theme/tokens";
import { cn } from "../../../utils/cn";

/** Time-based greeting for home (Figma 565-2774) */
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface HeaderProps {
  onNotificationPress: () => void;
  /** Optional: navigate to global search (Figma 795-6009) */
  onSearchPress?: () => void;
  /** Optional: "Good morning, {firstName}" when provided (Figma 565-2774) */
  userName?: string | null;
}

function Header({ onNotificationPress, onSearchPress, userName }: HeaderProps) {
  const [unreadCount, setUnreadCount] = React.useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await notificationApi.getUnreadCount();
        if (response.success) setUnreadCount(response.count ?? 0);
      } catch {
        // Non-critical
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const greetingLine = useMemo(() => {
    const greeting = getTimeBasedGreeting();
    const firstName = userName?.trim().split(/\s+/)[0] || null;
    return firstName ? `${greeting}, ${firstName}` : greeting;
  }, [userName]);

  return (
    <View style={styles.wrapper}>
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transitions.snappy}
        style={styles.inner}
      >
        <View>
          <Text style={styles.greeting}>{greetingLine}</Text>
          <Image
            source={require("../../../assets/compact-logo.png")}
            style={styles.logo}
          />
        </View>
        <View style={styles.headerActions}>
          {onSearchPress && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onSearchPress}
              activeOpacity={0.7}
            >
              <Search size={24} color={colorTokens.text.primary} strokeWidth={2} />
            </TouchableOpacity>
            )}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Bell size={24} color={colorTokens.text.primary} strokeWidth={2} />
            {unreadCount > 0 && (
              <View
                className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-white"
                style={{ borderWidth: 1.5 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </MotiView>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: "#FFFFFF" },
  inner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: "#FFFFFF",
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colorTokens.text.secondary,
    marginBottom: spacing.xs,
  },
  logo: { width: 72, height: 72, resizeMode: "contain" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  iconButton: {
    padding: spacing.sm,
    borderRadius: radii.full,
    position: "relative",
  },
  divider: { height: 1, backgroundColor: colorTokens.neutral.outline },
});

export default memo(Header);
