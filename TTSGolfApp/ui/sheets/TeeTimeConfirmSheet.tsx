/**
 * Bottom sheet: "You're all set" / group confirmed (Figma-style).
 */
import React, { memo, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Calendar, MapPin, Check } from "lucide-react-native";
import { fontFamily, fontSize, palette, radii } from "../theme/tokens";

export type TeeTimeConfirmParticipant = {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  isCreator: boolean;
};

export interface TeeTimeConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  courseName: string;
  courseLocation: string;
  teeDate: string;
  teeTime: string;
  maxPlayers: number;
  acceptedParticipants: TeeTimeConfirmParticipant[];
  currentUserId?: string;
}

function formatSheetDate(dateStr: string): string {
  const parts = dateStr.split(/[-/]/).map(Number);
  const hasYmd = parts.length >= 3 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && Number.isFinite(parts[2]);
  const date = hasYmd
    ? new Date(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1)
    : new Date(dateStr);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = date.getDate();
  const suf = d === 1 || d === 21 || d === 31 ? "st" : d === 2 || d === 22 ? "nd" : d === 3 || d === 23 ? "rd" : "th";
  return `${days[date.getDay()]}, ${d}${suf} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatSheetTime(timeStr: string): string {
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] ?? "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/** First name + last initial, Figma-style */
function displayNameCompact(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return full;
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last[0]}.`;
}

function TeeTimeConfirmSheetInner({
  visible,
  onClose,
  courseName,
  courseLocation,
  teeDate,
  teeTime,
  maxPlayers,
  acceptedParticipants,
  currentUserId,
}: TeeTimeConfirmSheetProps) {
  const insets = useSafeAreaInsets();
  const dateLabel = useMemo(() => formatSheetDate(teeDate), [teeDate]);
  const timeLabel = useMemo(() => formatSheetTime(teeTime), [teeTime]);
  const cap = Math.max(maxPlayers, acceptedParticipants.length, 1);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <View style={styles.sheetHandleWrap}>
            <View style={styles.sheetHandle} />
          </View>

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <X size={22} color={palette.gray900} strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text style={styles.title}>{"You're all set"}</Text>
              <Text style={styles.subtitle}>Your group is confirmed</Text>
            </View>
            <View style={styles.closeBtn} />
          </View>

          <View style={styles.divider} />

          <View style={styles.padH}>
            <View style={styles.row}>
              <Calendar size={22} color={palette.gray500} strokeWidth={2} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{dateLabel}</Text>
                <Text style={styles.rowMeta}>{timeLabel}</Text>
              </View>
              <View style={styles.confirmedPill}>
                <Check size={14} color={palette.green700} strokeWidth={2.5} />
                <Text style={styles.confirmedPillText}>Confirmed</Text>
              </View>
            </View>

            <View style={[styles.row, styles.rowAfter]}>
              <MapPin size={22} color={palette.gray500} strokeWidth={2} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{courseName}</Text>
                <Text style={styles.rowMeta}>{courseLocation}</Text>
              </View>
            </View>

            <View style={[styles.row, styles.rowAfter]}>
              <View style={{ width: 22 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  Accepted - {acceptedParticipants.length} of {cap}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
                  {acceptedParticipants.map((p, idx) => {
                    const isSelf = !!(currentUserId && p.userId === currentUserId);
                    return (
                      <View key={p.id} style={[styles.avatarCell, idx > 0 && styles.avatarCellSpacing]}>
                        <View style={styles.avatarWrap}>
                          {p.avatar ? (
                            <Image source={{ uri: p.avatar }} style={styles.avatar} />
                          ) : (
                            <View style={styles.avatarPh}>
                              <Text style={styles.avatarPhText}>
                                {p.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </Text>
                            </View>
                          )}
                          <View style={styles.avatarBadge}>
                            <Check size={10} color={palette.white} strokeWidth={3} />
                          </View>
                        </View>
                        <Text style={styles.avatarName} numberOfLines={1}>
                          {isSelf ? (
                            <>
                              You
                              {p.isCreator ? <Text style={styles.hostMuted}>{"\u00a0"}(host)</Text> : null}
                            </>
                          ) : (
                            displayNameCompact(p.name)
                          )}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: "88%",
  },
  sheetHandleWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: palette.gray200 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  closeBtn: { width: 40, alignItems: "center", justifyContent: "center" },
  headerTitles: { flex: 1, alignItems: "center" },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: palette.gray900,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: palette.gray500,
    marginTop: 4,
    textAlign: "center",
  },
  divider: { height: 1, backgroundColor: palette.gray200 },
  padH: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "flex-start" },
  rowAfter: { marginTop: 22 },
  rowBody: { flex: 1, marginLeft: 12 },
  rowTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: palette.gray900,
    marginBottom: 4,
  },
  rowMeta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: palette.gray500,
  },
  confirmedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.green100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 8,
    alignSelf: "flex-start",
  },
  confirmedPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: palette.green700,
    marginLeft: 4,
  },
  avatarRow: {
    flexDirection: "row",
    paddingTop: 14,
    paddingRight: 8,
  },
  avatarCell: { width: 72, alignItems: "center" },
  avatarCellSpacing: { marginLeft: 16 },
  avatarWrap: { position: "relative" },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPh: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPhText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base, color: palette.gray600 },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.green500,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: palette.white,
  },
  avatarName: {
    marginTop: 8,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: palette.gray900,
    textAlign: "center",
    maxWidth: 72,
  },
  hostMuted: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: palette.gray400 },
});

export const TeeTimeConfirmSheet = memo(TeeTimeConfirmSheetInner);
TeeTimeConfirmSheet.displayName = "TeeTimeConfirmSheet";
