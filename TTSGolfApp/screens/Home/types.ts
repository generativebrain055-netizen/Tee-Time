export interface WeekDay {
  dayName: string;
  dayNumber: number;
  date: Date;
  hasEvent: boolean;
  isToday: boolean;
}

export interface Participant {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  isCreator: boolean;
}

export interface UpcomingTeeTime {
  id: string;
  courseName: string;
  courseLocation?: string;
  teeDate: string;
  teeTime: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "in_progress";
  participants: Participant[];
  maxPlayers: number;
}
