/**
 * In-memory calendar UI (selected day, visible month) so returning from
 * Tee Time Detail remounts FullCalendar without losing the user's place.
 */
import { create } from "zustand";
import { getDateKey } from "../screens/calendar/utils";

function defaults() {
  const t = new Date();
  return {
    selectedDateKey: getDateKey(t),
    currentMonth: t.getMonth(),
    currentYear: t.getFullYear(),
  };
}

export const useCalendarUiStore = create<ReturnType<typeof defaults>>(() =>
  defaults()
);
