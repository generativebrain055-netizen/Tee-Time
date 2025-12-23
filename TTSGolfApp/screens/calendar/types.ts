/**
 * Calendar screen type definitions
 */

export interface CalendarDay {
    day: number | "";
    id: string;
    hasEvent?: boolean;
    isSelected?: boolean;
    isToday?: boolean;
    events?: TeeTime[];
}

export interface TeeTime {
    id: string;
    date: string;
    time: string;
    course: string;
    location: string;
    players: number;
    status: "confirmed" | "pending" | "cancelled" | "completed";
}

export type TeeTimesMap = Map<string, TeeTime[]>;
