import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "../../components/common";
import { teeTimeApi, TeeTime } from "../../services/api";
import { useAuthStore } from "../../stores";
import { COLORS, DAYS_SHORT } from "./constants";
import { WeekDay, UpcomingTeeTime } from "./types";
import { Header, QuickActions, WeekCalendar, NextTeeTime } from "./components";

// Pure function - no side effects, memoizable
const getWeekDays = (teeTimes: TeeTime[]): WeekDay[] => {
  const today = new Date();
  const currentDay = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDay);

  const eventDates = new Set(
    teeTimes.map((tt) => new Date(tt.teeDate).toDateString())
  );

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      dayName: DAYS_SHORT[i],
      dayNumber: date.getDate(),
      date,
      hasEvent: eventDates.has(date.toDateString()),
      isToday: date.toDateString() === today.toDateString(),
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
});

function HomePage({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);

  // Use Zustand store instead of local state
  const user = useAuthStore((state) => state.user);
  const loadUser = useAuthStore((state) => state.loadUser);

  const loadData = useCallback(async () => {
    try {
      const teeTimeResponse = await teeTimeApi.getUpcoming(5);
      if (teeTimeResponse.success) {
        setTeeTimes(teeTimeResponse.teeTimes);
      }
    } catch (error) {
      console.log("Failed to load data:", error);
    }
  }, []);

  useEffect(() => {
    loadUser();
    loadData();
  }, [loadData, loadUser]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Memoized derived state
  const weekDays = useMemo(() => getWeekDays(teeTimes), [teeTimes]);
  const nextTeeTime = useMemo(
    () => (teeTimes.length > 0 ? transformTeeTime(teeTimes[0]) : null),
    [teeTimes]
  );

  // Stable callbacks - won't cause child re-renders
  const handleNotifications = useCallback(() => {
    navigation?.navigate("Notifications");
  }, [navigation]);

  const handleCreateTeeTime = useCallback(() => {
    navigation?.navigate("CreateTeeTime");
  }, [navigation]);

  const handleInvitePlayers = useCallback(() => {
    navigation?.navigate("Roster");
  }, [navigation]);

  const handleTeeTimePress = useCallback(
    (teeTimeId: string) => {
      navigation?.navigate("TeeTimeDetail", { teeTimeId });
    },
    [navigation]
  );

  const handleFindAvailability = useCallback(() => {
    navigation?.navigate("Availability");
  }, [navigation]);

  const handleScanQR = useCallback(() => {
    navigation?.navigate("ScanQR");
  }, [navigation]);

  const handleViewSchedule = useCallback(() => {
    navigation?.navigate("FullCalendar");
  }, [navigation]);

  // Memoized refresh control to prevent recreation
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={COLORS.primary}
      />
    ),
    [refreshing, onRefresh]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Header onNotificationPress={handleNotifications} />
        <QuickActions
          onCreateTeeTime={handleCreateTeeTime}
          onInvitePlayers={handleInvitePlayers}
          onFindAvailability={handleFindAvailability}
          onScanQR={handleScanQR}
        />
        <WeekCalendar weekDays={weekDays} onViewSchedule={handleViewSchedule} />
        <NextTeeTime
          teeTime={nextTeeTime}
          currentUserId={user?.id}
          onPress={handleTeeTimePress}
        />
      </ScrollView>
      <BottomNav activeTab="Home" navigation={navigation} />
    </View>
  );
}

export default memo(HomePage);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
});
