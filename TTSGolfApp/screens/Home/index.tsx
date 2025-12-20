import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { BottomNav } from "../../components/common";
import { teeTimeApi, TeeTime } from "../../services/api";
import { COLORS, DAYS_SHORT } from "./constants";
import { WeekDay, UpcomingTeeTime } from "./types";
import { Header, QuickActions, WeekCalendar, NextTeeTime } from "./components";

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

export default function HomePage({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | undefined>();

    const loadData = useCallback(async () => {
        try {
            const [teeTimeResponse, storedUser] = await Promise.all([
                teeTimeApi.getUpcoming(5),
                AsyncStorage.getItem("user"),
            ]);

            if (teeTimeResponse.success) {
                setTeeTimes(teeTimeResponse.teeTimes);
            }

            if (storedUser) {
                const user = JSON.parse(storedUser);
                setCurrentUserId(user.id);
            }
        } catch (error) {
            console.log("Failed to load data:", error);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const weekDays = useMemo(() => getWeekDays(teeTimes), [teeTimes]);
    const nextTeeTime = useMemo(
        () => (teeTimes.length > 0 ? transformTeeTime(teeTimes[0]) : null),
        [teeTimes]
    );

    const handleNotifications = () => {
        navigation?.navigate("Roster", { initialTab: "Requests" });
    };

    const handleCreateTeeTime = () => navigation?.navigate("CreateTeeTime");
    const handleInvitePlayers = () => navigation?.navigate("Roster");
    const handleFindAvailability = () => navigation?.navigate("Availability");
    const handleViewSchedule = () => navigation?.navigate("FullCalendar");

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary}
                    />
                }
            >
                <Header onNotificationPress={handleNotifications} />
                <QuickActions
                    onCreateTeeTime={handleCreateTeeTime}
                    onInvitePlayers={handleInvitePlayers}
                    onFindAvailability={handleFindAvailability}
                />
                <WeekCalendar weekDays={weekDays} onViewSchedule={handleViewSchedule} />
                <NextTeeTime teeTime={nextTeeTime} currentUserId={currentUserId} />
            </ScrollView>
            <BottomNav activeTab="Home" navigation={navigation} />
        </View>
    );
}

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
