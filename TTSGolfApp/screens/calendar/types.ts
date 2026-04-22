/**
 * Calendar screen type definitions
 */

export interface CalendarDay {
  day: number | "";
  id: string;
  hasEvent?: boolean;
  isSelected?: boolean;
  isToday?: boolean;
  /** True when day is from previous or next month (shown in grey) */
  isOtherMonth?: boolean;
  /** Year (0-indexed month); set for non-empty cells so tap can resolve to a Date */
  year?: number;
  month?: number;
  events?: CalendarTeeTime[];
}

export interface CalendarParticipant {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  isCreator: boolean;
  status?: "confirmed" | "pending" | "no_show";
  attendanceStatus?: "present" | "no_show" | "pending" | null;
}

export interface CalendarTeeTime {
  id: string;
  date: string;
  time: string;
  course: string;
  location: string;
  players: number;
  maxPlayers?: number;
  participantCount?: number;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "in_progress";
  creatorId?: string;
  isOrganizer?: boolean;
  participants?: CalendarParticipant[];
}

export type TeeTimesMap = Map<string, CalendarTeeTime[]>;
