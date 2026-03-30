/**
 * Calendar data and state management hook
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { teeTimeApi } from "../../../services/api";
import { useAuthStore } from "../../../stores";
import type { TeeTime as ApiTeeTime } from "../../../services/api";
import { CalendarTeeTime, TeeTimesMap } from "../types";
import { createTeeTimesMap, generateCalendarDays, getDateKey } from "../utils";
import { logger } from "../../../utils/logger";

export type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "in_progress";
export type RoleFilter = "all" | "hosting" | "invited";

/** Calendar API may return entries with `date` (not teeDate); dateKey is the calendar object key. */
function mapApiToCalendar(
  api: ApiTeeTime & { date?: string },
  currentUserId?: string,
  dateKey?: string
): CalendarTeeTime {
  const participants = (api.participants || []).map((p) => ({
    id: p.id,
    userId: p.userId,
    name: p.name,
    avatar: p.avatar,
    isCreator: p.isCreator,
    status: "confirmed" as const,
  }));
  const creatorId =
    participants.find((p) => p.isCreator)?.userId ?? api.creatorId;
  const isOrganizer =
    !!currentUserId &&
    !!creatorId &&
    String(creatorId).toLowerCase() === String(currentUserId).toLowerCase();
  const raw = String(api.status ?? "").toLowerCase();
  const status =
    raw === "in_progress"
      ? "in_progress"
      : raw === "confirmed"
        ? "confirmed"
        : raw === "completed"
          ? "completed"
          : raw === "cancelled" || raw === "canceled"
            ? "cancelled"
            : "pending";
  const dateStr = api.teeDate ?? api.date ?? dateKey ?? "";
  return {
    id: api.id,
    date: dateStr,
    time: api.teeTime ?? "",
    course: api.courseName,
    location: api.courseLocation || "",
    players: api.participantCount ?? api.maxPlayers ?? 0,
    status,
    creatorId,
    isOrganizer,
    participants,
  };
}

export const useCalendar = () => {
  const today = new Date();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [teeTimes, setTeeTimes] = useState<CalendarTeeTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const loadTeeTimes = useCallback(async () => {
    try {
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 3, 0);
      const start = startDate.toISOString().split("T")[0];
      const end = endDate.toISOString().split("T")[0];
      const response = await teeTimeApi.getCalendar(start, end);
      if (response.success && response.calendar) {
        const all: CalendarTeeTime[] = [];
        Object.entries(response.calendar).forEach(([dateKey, times]) => {
          (times as (ApiTeeTime & { date?: string })[]).forEach((t) => {
            all.push(mapApiToCalendar(t, currentUserId, dateKey));
          });
        });
        setTeeTimes(all);
      }
    } catch (error) {
      logger.error("[useCalendar] Failed to load calendar", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentYear, currentMonth, currentUserId]);

  useEffect(() => {
    loadTeeTimes();
  }, [loadTeeTimes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTeeTimes();
  }, [loadTeeTimes]);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return teeTimes;
    return teeTimes.filter((tt) => tt.status === statusFilter);
  }, [teeTimes, statusFilter]);

  const filteredTeeTimes = useMemo(() => {
    if (roleFilter === "all") return filteredByStatus;
    if (roleFilter === "hosting") return filteredByStatus.filter((tt) => tt.isOrganizer);
    return filteredByStatus.filter((tt) => !tt.isOrganizer);
  }, [filteredByStatus, roleFilter]);

  const teeTimesMap: TeeTimesMap = useMemo(
    () => createTeeTimesMap(filteredTeeTimes),
    [filteredTeeTimes]
  );

  const calendarDays = useMemo(
    () => generateCalendarDays(currentYear, currentMonth, selectedDate, teeTimesMap),
    [currentYear, currentMonth, selectedDate, teeTimesMap]
  );

  const selectedDateTeeTimes = useMemo(() => {
    if (!selectedDate) return [];
    const key = getDateKey(selectedDate);
    return teeTimesMap.get(key) || [];
  }, [selectedDate, teeTimesMap]);

  const handlePrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  }, [currentMonth]);

  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

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
    roleFilter,
    setRoleFilter,
    onRefresh,
    handlePrevMonth,
    handleNextMonth,
    handleDayPress,
  };
};
