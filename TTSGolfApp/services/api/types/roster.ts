/**
 * Roster API Types
 * @module services/api/types/roster
 */

export interface RosterContact {
  id: string;
  position: number;
  isOnDeck: boolean;
  contact: {
    userId?: string;
    phone?: string;
    name: string;
    email?: string;
    avatar?: string;
    handicap?: number;
    username?: string;
  };
  notes?: string;
  /** Group profile: set for the roster_groups owner row */
  groupMemberRole?: "organizer";
  /** Group profile: present when invite not yet accepted */
  inviteStatus?: "pending";
}

export interface RosterGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  /** Group avatar/image URL */
  avatar?: string;
  position: number;
  memberCount: number;
  onDeckCount: number;
  /** Number of upcoming tee times that have at least one participant in this group */
  upcomingTeeTimeCount?: number;
  autoInvite: boolean;
  maxMembers: number;
  isDefault: boolean;
  isOwner?: boolean;
  ownerId?: string;
  sortPreference?: SortPreference;
  /** True when the group has at least one invite not yet accepted/declined */
  hasPendingInvites?: boolean;
}

export type SortPreference =
  | "position"
  | "socialRate"
  | "handicap"
  | "name"
  | "distance"
  | "membership";

export interface AutoInviteMember {
  id: string;
  userId?: string;
  phone?: string;
  name: string;
  avatar?: string;
  handicap?: number;
  socialRate?: number;
}

export interface MemberProfile {
  id: string;
  position: number;
  isOnDeck: boolean;
  groupId?: string;
  groupName?: string;
  groupColor?: string;
  /** True when this roster contact (registered user) has blocked the viewer */
  blockedYou?: boolean;
  contact: {
    userId?: string;
    phone?: string;
    name: string;
    email?: string;
    username?: string;
    avatar?: string;
    bio?: string;
  };
  stats: {
    handicap?: number;
    socialRate?: number;
    roundsPlayed?: number;
    averageScore?: number;
    timesPlayedTogether?: number;
    invitesAccepted?: number;
    totalInvites?: number;
    acceptanceRate?: string;
    lastPlayedTogether?: string;
  };
  preferences: {
    location?: string;
    homeCourse?: string;
    preferredTeeTime?: string;
    walkOrRide?: string;
    playingPartnerPreference?: string;
  };
  equipment?: {
    driver?: string;
    irons?: string;
    putter?: string;
    ball?: string;
  };
  /** @deprecated Prefer memberships from profile */
  membership?: string;
  /** Active club memberships from the member's profile */
  memberships?: { id?: string; name: string; location?: string }[];
  distanceToCourse?: number;
  notes?: string;
}

export interface WaiverWireEntry {
  id: string;
  user: {
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    handicap?: number;
    socialRate?: number;
    location?: string;
    homeCourse?: string;
  };
  availableDate: string;
  preferredTime?: string;
  preferredCourse?: string;
  maxHandicap?: number;
  notes?: string;
}

// Request/Response types
export interface AddToRosterRequest {
  contactUserId?: string;
  contactPhone?: string;
  contactName?: string;
  contactEmail?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  autoInvite?: boolean;
  maxMembers?: number;
  memberIds?: string[];
}

export interface MoveMemberRequest {
  targetGroupId?: string;
  isOnDeck: boolean;
  newPosition?: number;
}

export interface AddToWaiverWireRequest {
  availableDate: string;
  preferredTime?: TimeSlot;
  preferredCourse?: string;
  maxHandicap?: number;
  notes?: string;
}

export interface UpdateWaiverWireRequest extends AddToWaiverWireRequest {}
