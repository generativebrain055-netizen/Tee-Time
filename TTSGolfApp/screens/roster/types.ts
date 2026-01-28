export interface RosterPerson {
  id: string;
  name: string;
  sub: string;
  img: string;
  phone?: string;
  email?: string;
  handicap?: number;
  socialRate?: number;
  gamesPlayed?: number;
  location?: string;
  homeCourse?: string;
  membership?: string;
  isOnDeck?: boolean;
  groupId?: string;
  groupName?: string;
  groupColor?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  onDeckCount: number;
  color: string;
  icon?: string;
  autoInvite: boolean;
  maxMembers: number;
  isDefault: boolean;
}

export interface Request {
  id: string;
  name: string;
  mutual: string;
  img: string;
}

export interface GroupMember {
  id: string;
  name: string;
  img: string;
  handicap?: number;
  socialRate?: number;
}

export interface MemberStats {
  handicap?: number;
  socialRate?: number;
  roundsPlayed?: number;
  averageScore?: number;
  timesPlayedTogether?: number;
  invitesAccepted?: number;
  totalInvites?: number;
  acceptanceRate?: string;
  lastPlayedTogether?: string;
}

export interface MemberPreferences {
  location?: string;
  homeCourse?: string;
  preferredTeeTime?: string;
  walkOrRide?: string;
  playingPartnerPreference?: string;
}

export interface MemberEquipment {
  driver?: string;
  irons?: string;
  putter?: string;
  ball?: string;
}

export interface PlayingHistory {
  id: string;
  teeTimeId?: string;
  courseName?: string;
  teeDate?: string;
  teeTime?: string;
  inviteStatus?: string;
  playedTogether: boolean;
  createdAt: string;
}

export interface WaiverWirePlayer {
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

export type SortOption = 'position' | 'socialRate' | 'handicap' | 'name' | 'distance' | 'membership';
