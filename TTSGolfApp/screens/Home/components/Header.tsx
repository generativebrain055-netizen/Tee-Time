import React, { memo, useEffect } from "react";
import { View, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Bell, Search } from "lucide-react-native";
import { MotiView } from "moti";
import { notificationApi } from "../../../services/api";
import { transitions } from "../../../theme/animations";
import { colorTokens } from "../../../theme/tokens";
import { spacing, radii } from "../../../ui/theme/tokens";

interface HeaderProps {
  onNotificationPress: () => void;
  /** Optional: navigate to global search (Figma 795-6009) */
  onSearchPress?: () => void;
}

function Header({ onNotificationPress, onSearchPress }: HeaderProps) {
  const [unreadCount, setUnreadCount] = React.useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await notificationApi.getUnreadCount();
        const count = response.success && typeof response.count === "number" ? response.count : 0;
        setUnreadCount(count);
      } catch {
        setUnreadCount(0);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.wrapper}>
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transitions.snappy}
        style={styles.inner}
      >
        <View>
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
            {Number(unreadCount) > 0 ? (
              <View
                className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-white"
                style={{ borderWidth: 1.5 }}
              />
            ) : null}
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
