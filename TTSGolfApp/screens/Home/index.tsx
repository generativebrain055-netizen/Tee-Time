import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View, Modal, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Clock } from "lucide-react-native";

import { ScreenShell } from "../../ui/layout";
import { ContentArea } from "../../ui/layout";
import { AppBottomNav } from "../../ui/navigation";
import { TeeTime } from "../../services/api";
import { useAuthStore, useTeeTimeStore } from "../../stores";
import { DAYS_SHORT } from "./constants";
import { WeekDay, UpcomingTeeTime } from "./types";
import { Header, QuickActions, WeekCalendar, NextTeeTime } from "./components";
import { palette, spacing, fontSize, radii } from "../../ui/theme/tokens";
import { toCalendarDateKey } from "../../utils/formatting";

const WEEKLY_AVAILABILITY_PROMPT_KEY = "weekly_availability_prompt_week";

/** Returns YYYY-MM-DD of the Sunday that starts the current week (week runs Sun–Sat). */
function getWeekKey(d: Date): string {
  const day = d.getDay();
  const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return toCalendarDateKey(sunday);
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

const getWeekDays = (teeTimes: TeeTime[]): WeekDay[] => {
  const today = new Date();
  const currentDay = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDay);

  // Match tee times by calendar date (avoid new Date("YYYY-MM-DD") UTC shift)
  const teeTimeDates = new Set(teeTimes.map((tt) => toCalendarDateKey(tt.teeDate)));

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      dayName: DAYS_SHORT[i],
      dayNumber: date.getDate(),
      date,
      hasEvent: teeTimeDates.has(toCalendarDateKey(date)),
      isToday: toCalendarDateKey(date) === toCalendarDateKey(today),
    };
  });
};

const transformTeeTime = (tt: TeeTime): UpcomingTeeTime => ({
  id: tt.id,
  courseName: tt.courseName,
  courseLocation: tt.courseLocation,
  teeDate: tt.teeDate,
  teeTime: tt.teeTime,
  status: tt.status,
  participants: tt.participants || [],
  maxPlayers: tt.maxPlayers,
  participantCount: tt.participantCount,
});

function HomePage({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showWeeklyAvailabilityPrompt, setShowWeeklyAvailabilityPrompt] = useState(false);

  const user = useAuthStore((state) => state.user);
  const loadUser = useAuthStore((state) => state.loadUser);
  const upcomingTeeTimes = useTeeTimeStore((s) => s.upcomingTeeTimes);
  const fetchUpcoming = useTeeTimeStore((s) => s.fetchUpcoming);
  const hydrateFromCache = useTeeTimeStore((s) => s.hydrateFromCache);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await hydrateFromCache();
      if (mounted) fetchUpcoming(10);
    })();
    return () => {
      mounted = false;
    };
  }, [hydrateFromCache, fetchUpcoming]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const now = new Date();
      if (!isWeekend(now)) return;
      const weekKey = getWeekKey(now);
      try {
        const stored = await AsyncStorage.getItem(WEEKLY_AVAILABILITY_PROMPT_KEY);
        if (stored === weekKey) return;
        if (mounted) setShowWeeklyAvailabilityPrompt(true);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const dismissWeeklyPrompt = useCallback(
    (navigateToAvailability: boolean) => {
      const weekKey = getWeekKey(new Date());
      AsyncStorage.setItem(WEEKLY_AVAILABILITY_PROMPT_KEY, weekKey).catch(() => {});
      setShowWeeklyAvailabilityPrompt(false);
      if (navigateToAvailability) navigation?.navigate("EditAvailability");
    },
    [navigation]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUpcoming(10);
    setRefreshing(false);
  }, [fetchUpcoming]);

  const weekDays = useMemo(
    () => getWeekDays(upcomingTeeTimes),
    [upcomingTeeTimes]
  );

  const selectedKey = toCalendarDateKey(selectedDate);
  const teeTimeForSelectedDay = useMemo(() => {
    const found = upcomingTeeTimes.find(
      (tt) => toCalendarDateKey(tt.teeDate) === selectedKey
    );
    return found ? transformTeeTime(found) : null;
  }, [upcomingTeeTimes, selectedKey]);

  const handleNotifications = useCallback(() => {
    navigation?.navigate("Notifications");
  }, [navigation]);

  const handleCreateTeeTime = useCallback(() => {
    navigation?.navigate("CreateTeeTime");
  }, [navigation]);

  const handleInviteViaSMS = useCallback(() => {
    navigation?.navigate("InviteFriend");
  }, [navigation]);

  const handleFindPlayers = useCallback(() => {
    navigation?.navigate("FindPlayers");
  }, [navigation]);

  const handleTeeTimePress = useCallback(
    (teeTimeId: string) => {
      navigation?.navigate("TeeTimeDetail", { teeTimeId });
    },
    [navigation]
  );

  const handleViewSchedule = useCallback(() => {
    navigation?.navigate("FullCalendar");
  }, [navigation]);

  const handleSelectDay = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  return (
    <ScreenShell>
      <ContentArea
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <Header onNotificationPress={handleNotifications} />
        <QuickActions
          onCreateTeeTime={handleCreateTeeTime}
          onInviteViaSMS={handleInviteViaSMS}
          onFindPlayers={handleFindPlayers}
        />
        <WeekCalendar
          weekDays={weekDays}
          selectedDate={selectedDate}
          onSelectDay={handleSelectDay}
          onViewSchedule={handleViewSchedule}
          hideDivider={!teeTimeForSelectedDay}
        >
          <NextTeeTime
            teeTime={teeTimeForSelectedDay}
            currentUserId={user?.id}
            onPress={handleTeeTimePress}
          />
        </WeekCalendar>
      </ContentArea>
      <AppBottomNav activeTab="Home" navigation={navigation} />

      <Modal
        visible={showWeeklyAvailabilityPrompt}
        transparent
        animationType="fade"
      >
        <View style={weeklyPromptStyles.backdrop}>
          <View style={weeklyPromptStyles.card}>
            <View style={weeklyPromptStyles.iconWrap}>
              <Clock size={32} color={palette.green600} strokeWidth={2} />
            </View>
            <Text style={weeklyPromptStyles.title}>Set your availability</Text>
            <Text style={weeklyPromptStyles.message}>
              Set your availability for the upcoming week and update your Waiver Wire status so friends can find you for tee times.
            </Text>
            <View style={weeklyPromptStyles.actions}>
              <TouchableOpacity
                style={weeklyPromptStyles.secondaryButton}
                onPress={() => dismissWeeklyPrompt(false)}
                activeOpacity={0.7}
              >
                <Text style={weeklyPromptStyles.secondaryButtonText}>Maybe later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={weeklyPromptStyles.primaryButton}
                onPress={() => dismissWeeklyPrompt(true)}
                activeOpacity={0.7}
              >
                <Text style={weeklyPromptStyles.primaryButtonText}>Set availability</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const weeklyPromptStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 340,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.green100,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: palette.gray900,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: palette.gray600,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: palette.gray100,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: palette.gray600,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: palette.green500,
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: palette.white,
  },
});

export default memo(HomePage);
