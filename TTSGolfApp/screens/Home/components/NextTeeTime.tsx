import React, { memo } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Clock, MapPin, Calendar, Users } from "lucide-react-native";
import { MotiView } from "moti";
import { UpcomingTeeTime } from "../types";
import { transitions } from "../../../theme/animations";
import { spacing, fontSize, radii, shadows, palette } from "../../../ui/theme/tokens";
import { colorTokens } from "../../../theme/tokens";

const TickIcon = require("../../../assets/Tick.png");

interface NextTeeTimeProps {
  teeTime: UpcomingTeeTime | null;
  currentUserId?: string;
  onPress?: (teeTimeId: string) => void;
  /** e.g. "Dec 30th" for empty state title */
  selectedDateLabel?: string;
}

const formatTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getDateSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

const formatDateWithSuffix = (dateStr: string): string => {
  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${weekday}, ${month} ${day}${getDateSuffix(day)}`;
};

const getInitials = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getShortName = (name: string): string => {
  const parts = name.split(" ");
  const firstName = parts[0] || "";
  const lastInitial = parts[1] ? parts[1][0] : "";
  const shortName = lastInitial ? `${firstName} ${lastInitial}` : firstName;
  return shortName.length > 6 ? `${shortName.substring(0, 5)}...` : shortName;
};

/** Status badge config for home card (Figma 565-2774, 565-2912, etc.) */
const getStatusBadge = (status: UpcomingTeeTime["status"]) => {
  switch (status) {
    case "confirmed":
      return { label: "Confirmed", bg: palette.green100, text: "#15803D", icon: TickIcon };
    case "in_progress":
      return { label: "In progress", bg: palette.blue100, text: palette.blue700, icon: null };
    case "cancelled":
    case "completed":
      return { label: status === "cancelled" ? "Cancelled" : "Completed", bg: palette.gray100, text: palette.gray600, icon: null };
    case "pending":
    default:
      return { label: "Pending", bg: palette.amber100, text: palette.amber700, icon: null };
  }
};

function NextTeeTime({
  teeTime,
  currentUserId,
  onPress,
  selectedDateLabel,
}: NextTeeTimeProps) {
  if (!teeTime) {
    const emptyTitle = selectedDateLabel
      ? `Next tee time (${selectedDateLabel})`
      : "Next tee time";
    return (
      <View style={styles.emptyRoot}>
        <Text style={styles.sectionTitle}>{emptyTitle}</Text>
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={transitions.standard}
          style={styles.emptyCard}
        >
          <View style={styles.emptyIconWrap}>
            <Calendar size={40} color={palette.gray300} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyText}>
            No tee times scheduled{"\n"}for this day
          </Text>
        </MotiView>
      </View>
    );
  }

  const formattedDate = formatDateWithSuffix(teeTime.teeDate);
  const statusBadge = getStatusBadge(teeTime.status);
  const borderLeftColor =
    teeTime.status === "confirmed"
      ? palette.emerald600
      : teeTime.status === "in_progress"
        ? palette.blue500
        : palette.amber500;

  return (
    <View style={styles.root}>
      <Text style={styles.sectionTitle}>
        Next tee time ({formattedDate})
      </Text>
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={transitions.standard}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPress?.(teeTime.id)}
          style={[styles.card, shadows.sm, { borderLeftColor, borderLeftWidth: 4 }]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardDate}>{formattedDate}</Text>
            <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
              {statusBadge.icon && (
                <Image
                  source={statusBadge.icon}
                  style={styles.badgeIcon}
                  resizeMode="contain"
                />
              )}
              <Text style={[styles.badgeText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Clock size={18} color={palette.gray400} />
            <Text style={styles.cardTime}>{formatTime(teeTime.teeTime)}</Text>
          </View>

          <View style={styles.rowLocation}>
            <MapPin size={18} color={palette.gray400} style={{ marginTop: 2 }} />
            <View>
              <Text style={styles.courseName}>{teeTime.courseName}</Text>
              {teeTime.courseLocation && (
                <Text style={styles.courseLocation}>{teeTime.courseLocation}</Text>
              )}
            </View>
          </View>

          <View style={styles.participantsRow}>
            <Users size={18} color={palette.gray400} />
            <View style={styles.participantsList}>
              {teeTime.participants.map((p, index) => {
                const isCurrentUser = p.userId === currentUserId;
                const displayName = isCurrentUser ? "You" : getShortName(p.name);
                return (
                  <View key={p.id || index} style={styles.participantItem}>
                    <View style={styles.avatarWrap}>
                      {p.avatar ? (
                        <Image
                          source={{ uri: p.avatar }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarInitials}>
                            {getInitials(p.name)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.avatarTick}>
                        <Image source={TickIcon} style={styles.avatarTickImg} resizeMode="contain" />
                      </View>
                    </View>
                    <Text style={styles.participantName}>{displayName}</Text>
                    {p.isCreator && (
                      <Text style={styles.participantHost}>(host)</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#FFFFFF",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md + 8,
  },
  emptyRoot: {
    backgroundColor: "#FFFFFF",
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 8,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colorTokens.text.secondary,
    marginBottom: spacing.lg,
  },
  emptyCard: {
    flex: 1,
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  emptyIconWrap: { marginBottom: spacing.lg, opacity: 0.5 },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colorTokens.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderLeftWidth: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  cardDate: {
    fontFamily: "Inter_700Bold",
    fontSize: fontSize.base,
    color: colorTokens.text.primary,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  badgeIcon: { width: 14, height: 14 },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rowLocation: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md + 8,
  },
  courseName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colorTokens.text.primary,
  },
  courseLocation: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colorTokens.text.secondary,
    marginTop: 2,
  },
  cardTime: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colorTokens.text.primary,
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  participantsList: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
  },
  participantItem: {
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 70,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarPlaceholder: {
    backgroundColor: palette.emerald500,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: "#FFFFFF",
  },
  avatarTick: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTickImg: { width: 18, height: 18 },
  participantName: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: palette.gray600,
  },
  participantHost: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: palette.gray400,
    marginTop: -2,
  },
});

export default memo(NextTeeTime);
