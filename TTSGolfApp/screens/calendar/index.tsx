/**
 * Full Calendar Screen - Modular Implementation
 */
import React, { useCallback } from "react";
import { View, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";

import { useCalendar } from "./hooks/useCalendar";
import { CalendarGrid, TeeTimesList } from "./components";
import { CALENDAR_COLORS } from "./constants";
import { Header } from "../../components/common";

interface Props {
    navigation: any;
}

export default function FullCalendarScreen({ navigation }: Props) {
    const {
        currentMonth,
        currentYear,
        selectedDate,
        loading,
        refreshing,
        calendarDays,
        selectedDateTeeTimes,
        onRefresh,
        handlePrevMonth,
        handleNextMonth,
        handleDayPress,
    } = useCalendar();

    const handleBack = useCallback(() => {
        navigation?.goBack();
    }, [navigation]);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Header title="Calendar" onBack={handleBack} />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[CALENDAR_COLORS.primary]}
                    />
                }
            >
                <CalendarGrid
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    calendarDays={calendarDays}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    onDayPress={handleDayPress}
                />
                <TeeTimesList
                    selectedDate={selectedDate}
                    teeTimes={selectedDateTeeTimes}
                    loading={loading}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CALENDAR_COLORS.bg,
    },
    scrollView: {
        flex: 1,
    },
});
