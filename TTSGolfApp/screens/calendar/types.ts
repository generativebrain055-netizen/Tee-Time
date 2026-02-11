/**
 * Calendar screen type definitions
 */

export interface CalendarDay {
  day: number | "";
  id: string;
  hasEvent?: boolean;
  isSelected?: boolean;
  isToday?: boolean;
  events?: CalendarTeeTime[];
}

export interface CalendarParticipant {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  isCreator: boolean;
  status?: "confirmed" | "pending";
}

export interface CalendarTeeTime {
  id: string;
  date: string;
  time: string;
  course: string;
  location: string;
  players: number;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "in_progress";
  creatorId?: string;
  isOrganizer?: boolean;
  participants?: CalendarParticipant[];
}

export type TeeTimesMap = Map<string, CalendarTeeTime[]>;
