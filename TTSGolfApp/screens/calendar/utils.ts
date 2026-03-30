/**
 * Calendar utility functions
 */
import { CalendarDay, CalendarTeeTime, TeeTimesMap } from "./types";

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

/** Key for calendar map: year-month-day (month 0-indexed). Returns "" if dateStr is missing or invalid. */
export const getDateKeyFromDateStr = (dateStr: string | undefined | null): string => {
  if (dateStr == null || typeof dateStr !== "string" || !dateStr.trim()) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return "";
  const [y, m, d] = parts.map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return "";
  return `${y}-${m - 1}-${d}`;
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

  // Previous month trailing days (e.g. Nov 30 when first day of Dec is Monday)
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrevMonth - firstDay + 1 + i;
    const dateKey = `${prevYear}-${prevMonth}-${d}`;
    const events = teeTimesMap.get(dateKey);
    const isSelected =
      selectedDate &&
      selectedDate.getFullYear() === prevYear &&
      selectedDate.getMonth() === prevMonth &&
      selectedDate.getDate() === d;
    days.push({
      day: d,
      id: `prev-${prevYear}-${prevMonth}-${d}`,
      year: prevYear,
      month: prevMonth,
      hasEvent: !!events && events.length > 0,
      isSelected: !!isSelected,
      isToday: false,
      isOtherMonth: true,
      events,
    });
  }

  // Current month
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
      id: `day-${year}-${month}-${day}`,
      year,
      month,
      hasEvent: !!events && events.length > 0,
      isSelected: !!isSelected,
      isToday,
      isOtherMonth: false,
      events,
    });
  }

  // Next month leading days to fill the last row (6 rows of 7 = 42 cells max)
  const totalSoFar = days.length;
  const remaining = 42 - totalSoFar;
  for (let i = 0; i < remaining; i++) {
    const d = i + 1;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateKey = `${nextYear}-${nextMonth}-${d}`;
    const events = teeTimesMap.get(dateKey);
    const isSelected =
      selectedDate &&
      selectedDate.getFullYear() === nextYear &&
      selectedDate.getMonth() === nextMonth &&
      selectedDate.getDate() === d;
    days.push({
      day: d,
      id: `next-${nextYear}-${nextMonth}-${d}`,
      year: nextYear,
      month: nextMonth,
      hasEvent: !!events && events.length > 0,
      isSelected: !!isSelected,
      isToday: false,
      isOtherMonth: true,
      events,
    });
  }

  return days;
};

export const createTeeTimesMap = (teeTimes: CalendarTeeTime[]): TeeTimesMap => {
  const map = new Map<string, CalendarTeeTime[]>();
  teeTimes.forEach((teeTime) => {
    const key = getDateKeyFromDateStr(teeTime.date);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(teeTime);
  });
  return map;
};

export const getDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

/** Inverse of getDateKey (year, 0-indexed month, day). */
export const parseCalendarDateKey = (key: string): Date | null => {
  const parts = key.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const out = new Date(y, m, d);
  return Number.isNaN(out.getTime()) ? null : out;
};

export const formatSelectedDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

/** "Mon, July 24th" */
export const formatTeeTimeDate = (dateStr: string | undefined | null): string => {
  if (dateStr == null || typeof dateStr !== "string" || !dateStr.trim()) return "";
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const suffix =
    day >= 11 && day <= 13 ? "th" : day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";
  return `${weekday}, ${month} ${day}${suffix}`;
};

/** "3:15 PM" from "15:15" */
export const formatTeeTimeTime = (timeStr: string | undefined | null): string => {
  if (timeStr == null || typeof timeStr !== "string" || !timeStr.trim()) return "";
  const parts = timeStr.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${(Number.isNaN(m) ? 0 : m).toString().padStart(2, "0")} ${ampm}`;
};
