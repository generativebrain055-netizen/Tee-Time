/**
 * Full Calendar Screen - Modular Implementation
 */
import React, { useCallback, memo, useState } from "react";
import { View, ScrollView, RefreshControl, StyleSheet, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Filter, Check } from "lucide-react-native";

import { useCalendar, StatusFilter } from "./hooks/useCalendar";
import { CalendarGrid, TeeTimesList } from "./components";
import { CALENDAR_COLORS } from "./constants";
import { Header } from "../../components/common";

interface Props {
    navigation: any;
}

const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All Tee Times" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "completed", label: "Completed" },
];

export default function FullCalendarScreen({ navigation }: Props) {
    const {
        currentMonth,
        currentYear,
        selectedDate,
        loading,
        refreshing,
        calendarDays,
        selectedDateTeeTimes,
        statusFilter,
        setStatusFilter,
        onRefresh,
        handlePrevMonth,
        handleNextMonth,
        handleDayPress,
    } = useCalendar();

    const [showFilterModal, setShowFilterModal] = useState(false);

    const handleBack = useCallback(() => {
        navigation?.goBack();
    }, [navigation]);

    const handleFilterSelect = useCallback((filter: StatusFilter) => {
        setStatusFilter(filter);
        setShowFilterModal(false);
    }, [setStatusFilter]);

    const handleTeeTimePress = useCallback((teeTimeId: string) => {
        navigation?.navigate("TeeTimeDetail", { teeTimeId });
    }, [navigation]);

    const activeFilterLabel = FILTERS.find(f => f.key === statusFilter)?.label || "All";

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Header
                title="Calendar"
                onBack={handleBack}
                rightComponent={
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Filter size={20} color={CALENDAR_COLORS.primary} />
                    </TouchableOpacity>
                }
            />
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
                    onTeeTimePress={handleTeeTimePress}
                    onCancelSuccess={onRefresh}
                />
            </ScrollView>

            {/* Filter Dropdown Modal */}
            <Modal
                visible={showFilterModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowFilterModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
                    <View style={styles.dropdownContainer}>
                        <Text style={styles.dropdownTitle}>Filter by Status</Text>
                        {FILTERS.map((filter) => (
                            <TouchableOpacity
                                key={filter.key}
                                style={styles.dropdownItem}
                                onPress={() => handleFilterSelect(filter.key)}
                            >
                                <Text style={[
                                    styles.dropdownItemText,
                                    statusFilter === filter.key && styles.dropdownItemTextActive
                                ]}>
                                    {filter.label}
                                </Text>
                                {statusFilter === filter.key && (
                                    <Check size={18} color={CALENDAR_COLORS.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
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
    filterButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-start",
        alignItems: "flex-end",
        paddingTop: 100,
        paddingRight: 16,
    },
    dropdownContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        paddingVertical: 8,
        minWidth: 180,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    dropdownTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: CALENDAR_COLORS.textSecondary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    dropdownItemText: {
        fontSize: 15,
        color: CALENDAR_COLORS.text,
    },
    dropdownItemTextActive: {
        color: CALENDAR_COLORS.primary,
        fontWeight: "600",
    },
});
