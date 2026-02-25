import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View } from "react-native";

import { ScreenShell } from "../../ui/layout";
import { ContentArea } from "../../ui/layout";
import { AppBottomNav } from "../../ui/navigation";
import { TeeTime } from "../../services/api";
import { useAuthStore, useTeeTimeStore } from "../../stores";
import { DAYS_SHORT, DEFAULT_AD_SLOTS } from "./constants";
import { WeekDay, UpcomingTeeTime } from "./types";
import { Header, QuickActions, AdsSection, WeekCalendar, NextTeeTime } from "./components";

const toDateString = (d: Date | string) =>
  new Date(d).toDateString();

const getWeekDays = (selectedDate: Date, teeTimes: TeeTime[]): WeekDay[] => {
  const today = new Date();
  const currentDay = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDay);
  
  // Create a set of dates that have tee times
  const teeTimeDates = new Set(
    teeTimes.map(tt => new Date(tt.teeDate).toDateString())
  );
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      dayName: DAYS_SHORT[i],
      dayNumber: date.getDate(),
      date,
      hasEvent: teeTimeDates.has(date.toDateString()),
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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUpcoming(10);
    setRefreshing(false);
  }, [fetchUpcoming]);

  const weekDays = useMemo(
    () => getWeekDays(selectedDate, upcomingTeeTimes),
    [selectedDate, upcomingTeeTimes]
  );

  const selectedKey = toDateString(selectedDate);
  const teeTimeForSelectedDay = useMemo(() => {
    const found = upcomingTeeTimes.find(
      (tt) => toDateString(tt.teeDate) === selectedKey
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
    navigation?.navigate("CreateTeeTime", { inviteViaSMS: true });
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
        <AdsSection title="Sponsored" slots={DEFAULT_AD_SLOTS} />
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
    </ScreenShell>
  );
}

export default memo(HomePage);
