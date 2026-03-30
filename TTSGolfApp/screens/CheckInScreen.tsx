/**
 * Pre tee time check-in — per-player Yes/No presence + Save (Figma-style).
 */
import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  StyleSheet,
  BackHandler,
} from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenShell, AppHeader } from "../ui";
import { useColors } from "../ui/theme";
import {
  attendanceApi,
  AttendanceRecord,
  isAttendanceRecordNotFoundApiError,
  isCheckInAlreadyFinalizedApiError,
} from "../services/api";
import { spacing, fontSize, fontFamily, radii, palette } from "../ui/theme/tokens";
import { logger } from "../utils/logger";

interface CheckInScreenProps {
  route: {
    params: {
      teeTimeId: string;
      courseName?: string;
      teeDate?: string;
      teeTime?: string;
    };
  };
  navigation: any;
}

function formatCheckInSummaryLine(teeDate?: string, teeTime?: string, courseName?: string): string {
  if (!teeDate?.trim() || !teeTime?.trim() || !courseName?.trim()) return "";
  const parts = teeDate.split(/[-/]/).map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return "";
  const d = new Date(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1);
  if (Number.isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const [h = 0, m = 0] = teeTime.split(":").map((x) => parseInt(x, 10));
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  const timeLabel = `${h12}:${(Number.isNaN(m) ? 0 : m).toString().padStart(2, "0")} ${ampm}`;
  return `${weekday}, ${md}, ${timeLabel} – ${courseName}`;
}

const YesNoToggle = memo(
  ({
    value,
    onChange,
    disabled,
    colors,
  }: {
    value: "present" | "no_show";
    onChange: (v: "present" | "no_show") => void;
    disabled?: boolean;
    colors: ReturnType<typeof useColors>;
  }) => {
    const isYes = value === "present";
    return (
      <View style={[toggleStyles.track, { backgroundColor: palette.gray200 }, disabled && { opacity: 0.55 }]}>
        <TouchableOpacity
          style={[toggleStyles.segment, !isYes && toggleStyles.segmentOn]}
          onPress={() => onChange("no_show")}
          disabled={disabled}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Mark as not here"
          accessibilityState={{ selected: !isYes }}
        >
          <Text style={[toggleStyles.segmentText, !isYes ? toggleStyles.segmentTextOn : toggleStyles.segmentTextOff]}>
            No
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[toggleStyles.segment, isYes && toggleStyles.segmentOn]}
          onPress={() => onChange("present")}
          disabled={disabled}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Mark as here"
          accessibilityState={{ selected: isYes }}
        >
          <Text style={[toggleStyles.segmentText, isYes ? toggleStyles.segmentTextOn : toggleStyles.segmentTextOff]}>
            Yes
          </Text>
        </TouchableOpacity>
      </View>
    );
  },
);

const toggleStyles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radii.full,
    padding: 3,
    minWidth: 118,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentOn: {
    backgroundColor: palette.white,
  },
  segmentText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  segmentTextOn: {
    color: palette.gray900,
  },
  segmentTextOff: {
    color: palette.gray400,
  },
});

const AttendanceRow = memo(
  ({
    participant,
    presence,
    onPresenceChange,
    colors,
  }: {
    participant: AttendanceRecord;
    presence: "present" | "no_show";
    onPresenceChange: (id: string, v: "present" | "no_show") => void;
    colors: ReturnType<typeof useColors>;
  }) => {
    const initials =
      participant.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";

    return (
      <View style={[rowStyles.row, { borderBottomColor: colors.border }]}>
        <View style={rowStyles.left}>
          {participant.avatar ? (
            <Image source={{ uri: participant.avatar }} style={rowStyles.avatar} />
          ) : (
            <View style={[rowStyles.avatarPh, { backgroundColor: colors.primary }]}>
              <Text style={[rowStyles.avatarPhText, { color: colors.onPrimary }]}>{initials}</Text>
            </View>
          )}
          <Text style={[rowStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {participant.name}
          </Text>
        </View>
        <YesNoToggle
          value={participant.isCreator ? "present" : presence}
          onChange={(v) => onPresenceChange(participant.id, v)}
          disabled={participant.isCreator}
          colors={colors}
        />
      </View>
    );
  },
);

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    marginRight: spacing.md,
  },
  avatarPh: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    marginRight: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPhText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    flex: 1,
  },
});

export default function CheckInScreen({ route, navigation }: CheckInScreenProps) {
  const teeTimeId = route?.params?.teeTimeId;
  const courseName = route?.params?.courseName;
  const teeDate = route?.params?.teeDate;
  const teeTime = route?.params?.teeTime;
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [participants, setParticipants] = useState<AttendanceRecord[]>([]);
  const [presenceById, setPresenceById] = useState<Record<string, "present" | "no_show">>({});
  const [checkInAvailable, setCheckInAvailable] = useState(true);
  const [checkInMessage, setCheckInMessage] = useState<string | undefined>();

  const summaryLine =
    formatCheckInSummaryLine(teeDate, teeTime, courseName) || (courseName?.trim() ? courseName.trim() : "");

  const loadAttendance = useCallback(async () => {
    if (!teeTimeId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await attendanceApi.getAttendance(teeTimeId);
      if (response.success) {
        const active = response.attendance.filter((p) => p.status !== "cancelled");
        setParticipants(active);
        const next: Record<string, "present" | "no_show"> = {};
        active.forEach((p) => {
          next[p.id] = "present";
        });
        setPresenceById(next);
        setCheckInAvailable(response.checkInAvailable);
        setCheckInMessage(response.checkInMessage);
      } else {
        setCheckInAvailable(false);
        setCheckInMessage("Could not load this tee time.");
      }
    } catch (error) {
      logger.error("[CheckInScreen] Failed to load attendance", error);
      Alert.alert("Error", "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [teeTimeId]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handlePresenceChange = useCallback((id: string, v: "present" | "no_show") => {
    setPresenceById((prev) => ({ ...prev, [id]: v }));
  }, []);

  const handleHeaderBack = useCallback(() => {
    navigation?.goBack?.();
  }, [navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      navigation?.goBack?.();
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  const handleSave = useCallback(async () => {
    if (!teeTimeId) return;

    const nonOrganizers = participants.filter((p) => !p.isCreator);
    const updates = nonOrganizers.map((p) => ({
      attendanceId: p.id,
      ...(p.participantId ? { participantId: p.participantId } : {}),
      status: (presenceById[p.id] === "no_show" ? "no_show" : "present") as "present" | "no_show",
    }));

    const anyNoShow = updates.some((u) => u.status === "no_show");

    setSubmitting(true);
    try {
      if (!anyNoShow) {
        const response = await attendanceApi.checkInAll(teeTimeId);
        if (response.success) {
          Alert.alert("Saved", `All ${response.checkedIn} players checked in. Have a great round!`, [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        } else {
          throw new Error(response.message || "Check-in failed");
        }
      } else {
        const response = await attendanceApi.batchUpdateAttendance(teeTimeId, updates);
        if (response.success) {
          const msg =
            response.noShow > 0
              ? `${response.noShow} marked no-show. Penalties applied where applicable.`
              : response.message || "Check-in saved.";
          Alert.alert("Saved", msg, [{ text: "OK", onPress: () => navigation.goBack() }]);
        } else {
          throw new Error(response.message || "Failed to update attendance");
        }
      }
    } catch (error: unknown) {
      if (isCheckInAlreadyFinalizedApiError(error)) {
        navigation.goBack();
        return;
      }
      if (isAttendanceRecordNotFoundApiError(error)) {
        await loadAttendance();
        return;
      }
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to save check-in";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  }, [teeTimeId, participants, presenceById, navigation, loadAttendance]);

  const closeButton = (
    <TouchableOpacity
      onPress={handleHeaderBack}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityRole="button"
      accessibilityLabel="Close"
    >
      <X size={24} color={colors.textPrimary} strokeWidth={2.2} />
    </TouchableOpacity>
  );

  if (!teeTimeId) {
    return (
      <ScreenShell>
        <AppHeader title="Is everyone here?" leftComponent={closeButton} />
        <View style={styles.centerContainer}>
          <Text style={[styles.infoText, { color: colors.textPrimary, textAlign: "center", paddingHorizontal: 24 }]}>
            Missing tee time. Go back and open check-in from your schedule or tee time details.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  if (loading) {
    return (
      <ScreenShell>
        <AppHeader title="Is everyone here?" leftComponent={closeButton} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <AppHeader title="Is everyone here?" leftComponent={closeButton} />

      <View style={styles.flex}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!!summaryLine && (
            <Text style={[styles.summary, { color: colors.textPrimary }]} numberOfLines={2}>
              {summaryLine}
            </Text>
          )}

          {!checkInAvailable && checkInMessage && (
            <View style={[styles.warningBanner, { backgroundColor: colors.warningContainer }]}>
              <Text style={[styles.warningText, { color: colors.onWarningContainer }]}>
                {checkInMessage}
                {"\n\n"}
                You can still tap Save until check-in has been completed for this tee time.
              </Text>
            </View>
          )}

          {participants.map((p) => (
            <AttendanceRow
              key={p.id}
              participant={p}
              presence={presenceById[p.id] ?? "present"}
              onPresenceChange={handlePresenceChange}
              colors={colors}
            />
          ))}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, submitting && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>{submitting ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.white },
  scroll: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  summary: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    textAlign: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  warningBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  warningText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  infoText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: palette.white,
  },
  saveBtn: {
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
  },
});
