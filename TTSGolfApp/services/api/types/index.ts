/**
 * API Types Index
 * Re-exports all API types for cleaner imports
 * @module services/api/types
 */

// Roster types
export type {
  RosterContact,
  RosterGroup,
  SortPreference,
  AutoInviteMember,
  MemberProfile,
  WaiverWireEntry,
  TimeSlot,
  AddToRosterRequest,
  CreateGroupRequest,
  MoveMemberRequest,
  AddToWaiverWireRequest,
  UpdateWaiverWireRequest,
} from "./roster";

// Tee time types
export type {
  TeeTimeParticipant,
  TeeTime,
  TeeTimeInviteType,
  TeeTimeStatus,
  TeeTimeHistoryEntry,
  AttendanceStatus,
  CreateTeeTimeRequest,
  TeeTimeHistoryParams,
} from "./teeTime";

// Invite types
export interface Invite {
  id: string;
  teeTimeId: string;
  courseName: string;
  courseLocation?: string;
  teeDate: string;
  teeTime: string;
  status: InviteStatus;
  expiresAt?: string;
  inviteType?: string;
  maxPlayers?: number;
  inviter?: { firstName: string; lastName: string; avatar?: string };
  invitee?: { userId?: string; phone?: string; name: string };
}

export type InviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "waitlist";
export type InviteResponseType = "accepted" | "declined" | "maybe" | "waitlist";

export interface InviteResponse {
  id: string;
  response: InviteResponseType;
  message?: string;
  respondedVia: "app" | "sms" | "email" | "web";
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

// Profile types
export interface UserProfile {
  id: string;
  phoneNumber: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  handicap?: number;
  socialRate?: number;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  homeCourse?: string;
  clubs?: Array<{ id?: string; name: string; location?: string }>;
  equipment?: {
    driver?: string;
    irons?: string;
    putter?: string;
    ball?: string;
  };
  preferences?: {
    preferredTeeTime?: string;
    walkOrRide?: "walk" | "ride" | "either";
    playingPartnerPreference?: string;
    drinkOfChoice?: string;
  };
  timezone?: string;
  language?: string;
  notificationPreferences?: NotificationPreferences;
  privacySettings?: PrivacySettings;
  roundsPlayed?: number;
  averageScore?: number;
  createdAt?: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  /** Synced from OS permission; when false, backend does not send remote push. */
  systemPushEnabled?: boolean;
  // Per-type preferences for push and in-app notifications
  types?: {
    [key: string]: {
      push?: boolean;
      inApp?: boolean;
    };
  };
}

export interface PrivacySettings {
  showHandicap: boolean;
  showLocation: boolean;
  showPhone: boolean;
}

// Friend types
export interface DiscoveredUser {
  id: string;
  firstName: string;
  lastName: string;
  username?: string;
  handicap?: number;
  avatar?: string;
  location?: string;
  homeCourse?: string;
  preferredTeeTime?: string;
  walkOrRide?: string;
  socialRate?: number;
  friendshipStatus: FriendshipStatus;
  // Extended profile fields
  roundsPlayed?: number;
  roundsCount?: number;
  coursesCount?: number;
  golfVibe?: string;
  drinkOfChoice?: string;
  playingPartnerPreference?: string;
  recentRounds?: Array<{ courseName: string; date: string }>;
  clubs?: Array<{ id?: string; name: string; location?: string; type?: string }>;
  /** Shown only for accepted friends when privacy allows */
  phone?: string;
}

export type FriendshipStatus = "none" | "friend" | "requested" | "pending";

export interface FriendRequest {
  id: string;
  message?: string;
  createdAt: string;
  sender: DiscoveredUser;
}

export interface Friend extends DiscoveredUser {
  friendsSince: string;
  roundsPlayed?: number;
}

// Course types
export interface GolfCourse {
  id: string;
  googlePlaceId?: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
  photo?: string;
  photos?: string[];
  hours?: string[];
}

// Social Rate types
export interface SocialRateStats {
  totalAccepts: number;
  totalLateDeclines: number;
  totalLateCancellations: number;
  totalNoShows: number;
  totalEarned: number;
  totalLost: number;
}

export interface SocialRateData {
  currentScore: number;
  stats: SocialRateStats;
}

export interface SocialRateLogEntry {
  id: string;
  delta: number;
  previousScore: number;
  newScore: number;
  reason: string;
  reasonDetails?: string;
  teeTime?: {
    id: string;
    courseName: string;
    date: string;
    time: string;
  };
  createdAt: string;
}

// Attendance types
export interface AttendanceRecord {
  id: string;
  participantId: string;
  userId?: string;
  name: string;
  avatar?: string;
  isCreator: boolean;
  status: "pending" | "present" | "no_show" | "cancelled";
  checkedInAt?: string;
  markedNoShowAt?: string;
  penaltyApplied: boolean;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  noShow: number;
  cancelled: number;
  pending: number;
}

// Notification types
export interface AppNotification {
  id: string;
  type: "push" | "email" | "sms" | "in_app";
  channel?: string;
  title: string;
  body: string;
  data: NotificationData;
  status?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationData {
  type?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  location?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  ownerId?: string;
  ownerName?: string;
  teeTimeId?: string;
  inviterId?: string;
  inviterName?: string;
  inviterAvatar?: string;
  courseName?: string;
  date?: string;
  time?: string;
  teeDate?: string;
  teeTime?: string;
  maxPlayers?: number;
  spotsRemaining?: number;
  unfilledSlotAlert?: boolean;
  responderId?: string;
  responderName?: string;
  accepted?: boolean;
  groupName?: string;
  rosterId?: string;
  requestId?: string;
  responded?: boolean;
  expiresAt?: string;
  [key: string]: unknown;
}

// Draft (QR) types
export interface DraftQRCode {
  data: string;
  version: number;
}

export interface ScannedUser {
  id: string;
  name: string;
  avatar?: string;
  socialRate?: number;
  handicap?: number;
  homeCourse?: string;
  location?: string;
}

export interface ScanResult {
  success: boolean;
  user?: ScannedUser;
  mutualClubs?: string[];
  confirmationRequired?: boolean;
  /** When false, scan UI should not offer “Add to On-Deck” (blocked / already on roster or on-deck). */
  canAddToOnDeck?: boolean;
  /** Human-readable lines explaining relationship (blocked, friend, roster, on-deck). */
  statusDetailLines?: string[];
  message?: string;
  code?: string;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
