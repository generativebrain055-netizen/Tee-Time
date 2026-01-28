/**
 * API Module Index
 * Re-exports all API services and types for cleaner imports
 *
 * @example
 * // Import specific API
 * import { rosterApi } from '@/services/api';
 *
 * // Import types
 * import type { TeeTime, RosterContact } from '@/services/api';
 *
 * @module services/api
 */

// Core utilities
export {
  apiCall,
  getAuthHeaders,
  refreshAccessToken,
  ApiError,
  buildQueryString,
} from "./core";

// Domain APIs
export { rosterApi } from "./rosterApi";
export { teeTimeApi } from "./teeTimeApi";
export { inviteApi } from "./inviteApi";
export { friendApi } from "./friendApi";
export { profileApi } from "./profileApi";
export { courseApi } from "./courseApi";
export { notificationApi } from "./notificationApi";
export { socialRateApi } from "./socialRateApi";
export { attendanceApi } from "./attendanceApi";
export { draftApi } from "./draftApi";

// Types
export type {
  // Roster types
  RosterContact,
  RosterGroup,
  SortPreference,
  AutoInviteMember,
  MemberProfile,
  WaiverWireEntry,
  AddToRosterRequest,
  CreateGroupRequest,
  MoveMemberRequest,
  AddToWaiverWireRequest,
  // Tee time types
  TeeTimeParticipant,
  TeeTime,
  TeeTimeInviteType,
  TeeTimeStatus,
  TeeTimeHistoryEntry,
  AttendanceStatus,
  CreateTeeTimeRequest,
  TeeTimeHistoryParams,
  // Invite types
  Invite,
  InviteStatus,
  InviteResponseType,
  InviteResponse,
  // Profile types
  UserProfile,
  NotificationPreferences,
  PrivacySettings,
  // Friend types
  DiscoveredUser,
  FriendshipStatus,
  FriendRequest,
  Friend,
  // Course types
  GolfCourse,
  // Social rate types
  SocialRateStats,
  SocialRateData,
  SocialRateLogEntry,
  // Attendance types
  AttendanceRecord,
  AttendanceSummary,
  // Notification types
  AppNotification,
  NotificationData,
  // Draft types
  DraftQRCode,
  ScannedUser,
  ScanResult,
  // Generic types
  ApiResponse,
} from "./types";
