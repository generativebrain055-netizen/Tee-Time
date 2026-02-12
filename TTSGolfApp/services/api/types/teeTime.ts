/**
 * Tee Time API Types
 * @module services/api/types/teeTime
 */

export interface TeeTimeParticipant {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  isCreator: boolean;
}

export interface TeeTime {
  id: string;
  courseName: string;
  courseLocation?: string;
  teeDate: string;
  teeTime: string;
  maxPlayers: number;
  inviteType: TeeTimeInviteType;
  status: TeeTimeStatus;
  participantCount: number;
  creator?: { firstName: string; lastName: string };
  participants?: TeeTimeParticipant[];
  notes?: string;
}

export type TeeTimeInviteType = "roster" | "fcfs" | "open" | "manual";
export type TeeTimeStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "in_progress";

export interface TeeTimeHistoryEntry {
  id: string;
  courseName: string;
  courseLocation?: string;
  teeDate: string;
  teeTime: string;
  status: TeeTimeStatus;
  userRole: "organizer" | "participant";
  participantStatus?: string;
  attendanceStatus?: AttendanceStatus;
  gameScore?: number;
  holesPlayed?: number;
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  participantCount: number;
  maxPlayers: number;
}

export type AttendanceStatus = "pending" | "present" | "no_show" | "cancelled";

// Request types
export interface CreateTeeTimeRequest {
  courseName: string;
  courseLocation?: string;
  courseId?: string; // Golf course ID for distance calculations
  teeDate: string;
  teeTime: string;
  maxPlayers?: number;
  inviteType?: TeeTimeInviteType;
  notes?: string;
  distanceRadius?: number; // For Open invites - distance in miles
}

export interface TeeTimeHistoryParams {
  filter?: "all" | "upcoming" | "completed" | "cancelled" | "no_show";
  limit?: number;
  offset?: number;
}
