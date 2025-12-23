/**
 * Calendar data and state management hook
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { teeTimeApi } from "../../../services/api";
import { TeeTime, TeeTimesMap } from "../types";
import { createTeeTimesMap, generateCalendarDays, getDateKey } from "../utils";

export type StatusFilter = "all" | "pending" | "confirmed" | "completed";

export const useCalendar = () => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date | null>(today);
    const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const loadTeeTimes = useCallback(async () => {
        try {
            const startDate = new Date(currentYear, currentMonth - 1, 1);
            const endDate = new Date(currentYear, currentMonth + 4, 0);

            const start = startDate.toISOString().split("T")[0];
            const end = endDate.toISOString().split("T")[0];

            const response = await teeTimeApi.getCalendar(start, end);
            if (response.success && response.calendar) {
                const allTeeTimes: TeeTime[] = [];
                Object.entries(response.calendar).forEach(([dateStr, times]) => {
                    (times as any[]).forEach((t: any) => {
                        allTeeTimes.push({
                            id: t.id,
                            date: dateStr,
                            time: t.teeTime,
                            course: t.courseName,
                            location: t.courseLocation || "",
                            players: t.participantCount || 0,
                            status: t.status || "pending",
                        });
                    });
                });
                setTeeTimes(allTeeTimes);
            }
        } catch (error) {
            console.error("Failed to load calendar:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentMonth, currentYear]);

    useEffect(() => {
        loadTeeTimes();
    }, [loadTeeTimes]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadTeeTimes();
    }, [loadTeeTimes]);

    const teeTimesMap: TeeTimesMap = useMemo(
        () => createTeeTimesMap(teeTimes),
        [teeTimes]
    );

    // Filter tee times by status
    const filteredTeeTimes = useMemo(() => {
        if (statusFilter === "all") return teeTimes;
        return teeTimes.filter((tt) => tt.status === statusFilter);
    }, [teeTimes, statusFilter]);

    const filteredTeeTimesMap: TeeTimesMap = useMemo(
        () => createTeeTimesMap(filteredTeeTimes),
        [filteredTeeTimes]
    );

    const calendarDays = useMemo(
        () => generateCalendarDays(currentYear, currentMonth, selectedDate, filteredTeeTimesMap),
        [currentYear, currentMonth, selectedDate, filteredTeeTimesMap]
    );

    const selectedDateTeeTimes = useMemo(() => {
        if (!selectedDate) return [];
        const key = getDateKey(selectedDate);
        return filteredTeeTimesMap.get(key) || [];
    }, [selectedDate, filteredTeeTimesMap]);

    const handlePrevMonth = useCallback(() => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((y) => y - 1);
        } else {
            setCurrentMonth((m) => m - 1);
        }
    }, [currentMonth]);

    const handleNextMonth = useCallback(() => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((y) => y + 1);
        } else {
            setCurrentMonth((m) => m + 1);
        }
    }, [currentMonth]);

    const handleDayPress = useCallback(
        (day: number | "") => {
            if (day === "") return;
            setSelectedDate(new Date(currentYear, currentMonth, day));
        },
        [currentYear, currentMonth]
    );

    return {
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
    };
};
