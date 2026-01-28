/**
 * Calendar utility functions
 */
import { CalendarDay, TeeTime, TeeTimesMap } from "./types";

export const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
};

export const generateCalendarDays = (
    year: number,
    month: number,
    selectedDate: Date | null,
    teeTimesMap: TeeTimesMap
): CalendarDay[] => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const days: CalendarDay[] = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        days.push({ day: "", id: `empty-${i}` });
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
        const isSelected =
            selectedDate &&
            selectedDate.getFullYear() === year &&
            selectedDate.getMonth() === month &&
            selectedDate.getDate() === day;

        const events = teeTimesMap.get(dateKey);

        days.push({
            day,
            id: `day-${day}`,
            hasEvent: !!events && events.length > 0,
            isSelected: isSelected || false,
            isToday,
            events,
        });
    }

    return days;
};

export const createTeeTimesMap = (teeTimes: TeeTime[]): TeeTimesMap => {
    const map = new Map<string, TeeTime[]>();
    teeTimes.forEach((teeTime) => {
        const date = new Date(teeTime.date);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key)!.push(teeTime);
    });
    return map;
};

export const getDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export const formatSelectedDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
};
