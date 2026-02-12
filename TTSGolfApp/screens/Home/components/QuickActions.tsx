import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CalendarPlus, UserPlus, Search } from "lucide-react-native";
import { MotiView } from "moti";
import { transitions } from "../../../theme/animations";
import { spacing, fontSize, radii, shadows, palette } from "../../../ui/theme/tokens";
import { colorTokens } from "../../../theme/tokens";

interface QuickActionsProps {
  onCreateTeeTime: () => void;
  onInviteViaLink: () => void;
  onFindPlayers: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
  index,
}: {
  icon: typeof CalendarPlus;
  label: string;
  onPress: () => void;
  index: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ ...transitions.standard, delay: index * 50 }}
      style={styles.actionWrapper}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.actionCard, shadows.md]}
      >
        <View style={styles.iconWrap}>
          <Icon size={28} color={palette.green500} strokeWidth={2} />
        </View>
        <Text style={styles.actionLabel} numberOfLines={2}>
          {label}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );
}

function QuickActions({
  onCreateTeeTime,
  onInviteViaLink,
  onFindPlayers,
}: QuickActionsProps) {
  const actions = [
    { icon: CalendarPlus, label: "Create tee time", onPress: onCreateTeeTime },
    { icon: UserPlus, label: "Invite via link", onPress: onInviteViaLink },
    { icon: Search, label: "Find Players", onPress: onFindPlayers },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.row}>
        {actions.map((item, index) => (
          <ActionButton
            key={item.label}
            icon={item.icon}
            label={item.label}
            onPress={item.onPress}
            index={index}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["2xl"],
    backgroundColor: palette.gray50,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: fontSize.xl,
    color: colorTokens.text.primary,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionWrapper: {
    flex: 1,
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    aspectRatio: 1,
    elevation: 3,
  },
  iconWrap: {
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colorTokens.text.primary,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default memo(QuickActions);
