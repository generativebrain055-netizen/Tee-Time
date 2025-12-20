import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS, API_URL } from "../config/api";

// Types
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
}

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
  inviteType: "roster" | "fcfs" | "open";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  participantCount: number;
  creator?: { firstName: string; lastName: string };
  participants?: TeeTimeParticipant[];
  notes?: string;
}

export interface Invite {
  id: string;
  teeTimeId: string;
  courseName: string;
  courseLocation?: string;
  teeDate: string;
  teeTime: string;
  status: "pending" | "accepted" | "declined" | "expired" | "waitlist";
  inviter?: { firstName: string; lastName: string; avatar?: string };
  invitee?: { userId?: string; phone?: string; name: string };
}

// Helper to get auth headers
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Token refresh function
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) return null;

    const response = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      await AsyncStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem("refreshToken", data.refreshToken);
      }
      return data.accessToken;
    }

    // Refresh failed - clear tokens
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
    return null;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
};

// Generic API call wrapper with automatic token refresh
const apiCall = async <T>(
  url: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> => {
  const headers = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && retryOnUnauthorized) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry the request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
        },
      });
      const retryData = await retryResponse.json();
      if (!retryResponse.ok) {
        throw new Error(retryData.message || "API request failed");
      }
      return retryData;
    }
    // Token refresh failed
    throw new Error("Session expired. Please login again.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
};

// ============ ROSTER API ============

export interface RosterGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  position: number;
  memberCount: number;
  onDeckCount: number;
  autoInvite: boolean;
  maxMembers: number;
  isDefault: boolean;
}

export interface MemberProfile {
  id: string;
  position: number;
  isOnDeck: boolean;
  groupId?: string;
  groupName?: string;
  groupColor?: string;
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
  membership?: string;
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

export const rosterApi = {
  // Get user's roster with optional sorting
  getRoster: (sortBy?: 'position' | 'socialRate' | 'handicap' | 'name' | 'distance' | 'membership') => {
    const params = sortBy ? `?sortBy=${sortBy}` : '';
    return apiCall<{ success: boolean; roster: RosterContact[] }>(`${API_ENDPOINTS.ROSTER}${params}`);
  },

  // Get on-deck players
  getOnDeck: () =>
    apiCall<{ success: boolean; onDeck: RosterContact[] }>(API_ENDPOINTS.ROSTER_ON_DECK),

  // Add to roster
  addToRoster: (contact: {
    contactUserId?: string;
    contactPhone?: string;
    contactName?: string;
    contactEmail?: string;
  }) =>
    apiCall<{ success: boolean; entry: any }>(API_ENDPOINTS.ROSTER, {
      method: "POST",
      body: JSON.stringify(contact),
    }),

  // Remove from roster
  removeFromRoster: (rosterId: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.ROSTER}/${rosterId}`, {
      method: "DELETE",
    }),

  // Reorder roster (drag & drop)
  reorderRoster: (orderedIds: string[]) =>
    apiCall<{ success: boolean }>(API_ENDPOINTS.ROSTER_REORDER, {
      method: "PUT",
      body: JSON.stringify({ orderedIds }),
    }),

  // Toggle on-deck status
  toggleOnDeck: (rosterId: string, isOnDeck: boolean) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.ROSTER}/${rosterId}/on-deck`, {
      method: "PUT",
      body: JSON.stringify({ isOnDeck }),
    }),

  // Move member (drag & drop between roster/on-deck)
  moveMember: (rosterId: string, data: { targetGroupId?: string; isOnDeck: boolean; newPosition?: number }) =>
    apiCall<{ success: boolean; entry: any }>(`${API_ENDPOINTS.ROSTER}/${rosterId}/move`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Update member's group
  updateMemberGroup: (rosterId: string, groupId: string | null) =>
    apiCall<{ success: boolean; entry: any }>(`${API_ENDPOINTS.ROSTER}/${rosterId}/group`, {
      method: "PUT",
      body: JSON.stringify({ groupId }),
    }),

  // Get detailed member profile
  getMemberProfile: (rosterId: string) =>
    apiCall<{ success: boolean; profile: MemberProfile }>(`${API_ENDPOINTS.ROSTER}/${rosterId}/profile`),

  // Get member's playing history
  getMemberHistory: (rosterId: string) =>
    apiCall<{ success: boolean; history: any[] }>(`${API_ENDPOINTS.ROSTER}/${rosterId}/history`),

  // Search users
  searchUsers: (query: string) =>
    apiCall<{ success: boolean; users: any[] }>(`${API_ENDPOINTS.ROSTER_SEARCH}?q=${encodeURIComponent(query)}`),

  // ============ GROUPS ============

  // Get all groups
  getGroups: () =>
    apiCall<{ success: boolean; groups: RosterGroup[] }>(`${API_ENDPOINTS.ROSTER}/groups`),

  // Create group
  createGroup: (data: { name: string; description?: string; color?: string; icon?: string; autoInvite?: boolean; maxMembers?: number }) =>
    apiCall<{ success: boolean; group: RosterGroup }>(`${API_ENDPOINTS.ROSTER}/groups`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update group
  updateGroup: (groupId: string, data: Partial<RosterGroup>) =>
    apiCall<{ success: boolean; group: RosterGroup }>(`${API_ENDPOINTS.ROSTER}/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete group
  deleteGroup: (groupId: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.ROSTER}/groups/${groupId}`, {
      method: "DELETE",
    }),

  // Get group members
  getGroupMembers: (groupId: string, sortBy?: string) => {
    const params = sortBy ? `?sortBy=${sortBy}` : '';
    return apiCall<{ success: boolean; members: RosterContact[] }>(`${API_ENDPOINTS.ROSTER}/groups/${groupId}/members${params}`);
  },

  // ============ WAIVER WIRE ============

  // Get waiver wire for a date
  getWaiverWire: (date: string) =>
    apiCall<{ success: boolean; waiverWire: WaiverWireEntry[] }>(`${API_ENDPOINTS.ROSTER}/waiver-wire?date=${date}`),

  // Add to waiver wire
  addToWaiverWire: (data: { availableDate: string; preferredTime?: string; preferredCourse?: string; maxHandicap?: number; notes?: string }) =>
    apiCall<{ success: boolean; entry: any }>(`${API_ENDPOINTS.ROSTER}/waiver-wire`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Remove from waiver wire
  removeFromWaiverWire: (date: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.ROSTER}/waiver-wire/${date}`, {
      method: "DELETE",
    }),
};

// ============ TEE TIMES API ============

export const teeTimeApi = {
  // Create tee time
  createTeeTime: (data: {
    courseName: string;
    courseLocation?: string;
    teeDate: string;
    teeTime: string;
    maxPlayers?: number;
    inviteType?: "roster" | "fcfs" | "open";
    notes?: string;
  }) =>
    apiCall<{ success: boolean; teeTime: TeeTime }>(API_ENDPOINTS.TEE_TIMES, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get all tee times
  getTeeTimes: (status?: string) =>
    apiCall<{ success: boolean; teeTimes: TeeTime[] }>(
      status ? `${API_ENDPOINTS.TEE_TIMES}?status=${status}` : API_ENDPOINTS.TEE_TIMES
    ),

  // Get upcoming tee times
  getUpcoming: (limit = 10) =>
    apiCall<{ success: boolean; teeTimes: TeeTime[] }>(
      `${API_ENDPOINTS.TEE_TIMES_UPCOMING}?limit=${limit}`
    ),

  // Get tee time details
  getTeeTime: (id: string) =>
    apiCall<{ success: boolean; teeTime: any }>(`${API_ENDPOINTS.TEE_TIMES}/${id}`),

  // Cancel tee time
  cancelTeeTime: (id: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.TEE_TIMES}/${id}/cancel`, {
      method: "POST",
    }),

  // Get calendar data
  getCalendar: (start: string, end: string) =>
    apiCall<{ success: boolean; calendar: Record<string, TeeTime[]> }>(
      `${API_ENDPOINTS.TEE_TIMES_CALENDAR}?start=${start}&end=${end}`
    ),
};

// ============ INVITES API ============

export interface InviteResponse {
  id: string;
  response: "accepted" | "declined" | "maybe" | "waitlist";
  message?: string;
  respondedVia: "app" | "sms" | "email" | "web";
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export const inviteApi = {
  // Create invites
  createInvites: (teeTimeId: string, invitees: Array<{ userId?: string; phone?: string; name?: string }>) =>
    apiCall<{ success: boolean; invites: any[] }>(API_ENDPOINTS.INVITES, {
      method: "POST",
      body: JSON.stringify({ teeTimeId, invitees }),
    }),

  // Create invites from roster
  createFromRoster: (teeTimeId: string, rosterIds?: string[], count?: number) =>
    apiCall<{ success: boolean; invites: any[]; count: number }>(API_ENDPOINTS.INVITES_FROM_ROSTER, {
      method: "POST",
      body: JSON.stringify({ teeTimeId, rosterIds, count }),
    }),

  // Get pending invites (received)
  getPendingInvites: () =>
    apiCall<{ success: boolean; invites: Invite[] }>(API_ENDPOINTS.INVITES_PENDING),

  // Get sent invites
  getSentInvites: () =>
    apiCall<{ success: boolean; invites: Invite[] }>(API_ENDPOINTS.INVITES_SENT),

  // Respond to invite (with optional message)
  respondToInvite: (inviteId: string, response: "accepted" | "declined" | "maybe", message?: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.INVITES}/${inviteId}/respond`, {
      method: "PUT",
      body: JSON.stringify({ response, message }),
    }),

  // Get response history for an invite
  getInviteResponses: (inviteId: string) =>
    apiCall<{ success: boolean; responses: InviteResponse[] }>(`${API_ENDPOINTS.INVITES}/${inviteId}/responses`),

  // Get user's response history
  getResponseHistory: () =>
    apiCall<{ success: boolean; history: any[] }>(`${API_ENDPOINTS.INVITES}/history`),

  // Cancel invite
  cancelInvite: (inviteId: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.INVITES}/${inviteId}`, {
      method: "DELETE",
    }),

  // Get waitlist
  getWaitlist: (teeTimeId: string) =>
    apiCall<{ success: boolean; waitlist: any[] }>(`${API_ENDPOINTS.INVITES}/${teeTimeId}/waitlist`),
};

// ============ PROFILE API ============

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
  };
  timezone?: string;
  language?: string;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacySettings?: {
    showHandicap: boolean;
    showLocation: boolean;
    showPhone: boolean;
  };
  roundsPlayed?: number;
  averageScore?: number;
}

export const profileApi = {
  // Get current user with profile
  getCurrentUser: () =>
    apiCall<{ success: boolean; user: UserProfile }>(API_ENDPOINTS.GET_CURRENT_USER),

  // Update profile (handles both user and profile data)
  updateProfile: (data: Partial<UserProfile>) =>
    apiCall<{ success: boolean; user: UserProfile }>(API_ENDPOINTS.UPDATE_PROFILE, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Update notification preferences
  updateNotificationPreferences: (preferences: { email?: boolean; sms?: boolean; push?: boolean }) =>
    apiCall<{ success: boolean }>(API_ENDPOINTS.UPDATE_PROFILE, {
      method: "PUT",
      body: JSON.stringify({ notificationPreferences: preferences }),
    }),

  // Update privacy settings
  updatePrivacySettings: (settings: { showHandicap?: boolean; showLocation?: boolean; showPhone?: boolean }) =>
    apiCall<{ success: boolean }>(API_ENDPOINTS.UPDATE_PROFILE, {
      method: "PUT",
      body: JSON.stringify({ privacySettings: settings }),
    }),
};

// ============ FRIENDS API ============

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
  friendshipStatus: 'none' | 'friend' | 'requested' | 'pending';
}

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

export const friendApi = {
  // Send friend request
  sendRequest: (receiverId: string, message?: string) =>
    apiCall<{ success: boolean; request: any }>(API_ENDPOINTS.FRIENDS_REQUEST, {
      method: "POST",
      body: JSON.stringify({ receiverId, message }),
    }),

  // Get pending requests (received)
  getPendingRequests: () =>
    apiCall<{ success: boolean; requests: FriendRequest[] }>(API_ENDPOINTS.FRIENDS_REQUESTS_PENDING),

  // Get sent requests
  getSentRequests: () =>
    apiCall<{ success: boolean; requests: any[] }>(API_ENDPOINTS.FRIENDS_REQUESTS_SENT),

  // Respond to friend request
  respondToRequest: (requestId: string, response: 'accepted' | 'declined') =>
    apiCall<{ success: boolean; message: string }>(`${API_ENDPOINTS.FRIENDS}/requests/${requestId}/respond`, {
      method: "PUT",
      body: JSON.stringify({ response }),
    }),

  // Get friends list
  getFriends: () =>
    apiCall<{ success: boolean; friends: Friend[] }>(API_ENDPOINTS.FRIENDS),

  // Remove friend
  removeFriend: (friendId: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.FRIENDS}/${friendId}`, {
      method: "DELETE",
    }),

  // Discover users by location/course
  discoverUsers: (params?: { location?: string; course?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.location) query.append('location', params.location);
    if (params?.course) query.append('course', params.course);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const queryStr = query.toString();
    return apiCall<{ success: boolean; users: DiscoveredUser[] }>(
      `${API_ENDPOINTS.FRIENDS_DISCOVER}${queryStr ? `?${queryStr}` : ''}`
    );
  },

  // Get user profile
  getUserProfile: (userId: string) =>
    apiCall<{ success: boolean; profile: DiscoveredUser & { bio?: string; averageScore?: number } }>(
      `${API_ENDPOINTS.FRIENDS}/profile/${userId}`
    ),
};

// ============ COURSES API ============

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

export const courseApi = {
  // Search courses
  searchCourses: (query: string, lat?: number, lng?: number) => {
    const params = new URLSearchParams({ q: query });
    if (lat) params.append('lat', lat.toString());
    if (lng) params.append('lng', lng.toString());
    return apiCall<{ success: boolean; courses: GolfCourse[]; source: string }>(
      `${API_ENDPOINTS.COURSES_SEARCH}?${params.toString()}`
    );
  },

  // Get nearby courses
  getNearbyCourses: (lat: number, lng: number, radius?: number) => {
    const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString() });
    if (radius) params.append('radius', radius.toString());
    return apiCall<{ success: boolean; courses: GolfCourse[]; source: string }>(
      `${API_ENDPOINTS.COURSES_NEARBY}?${params.toString()}`
    );
  },

  // Get popular courses
  getPopularCourses: (limit?: number) =>
    apiCall<{ success: boolean; courses: GolfCourse[] }>(
      limit ? `${API_ENDPOINTS.COURSES_POPULAR}?limit=${limit}` : API_ENDPOINTS.COURSES_POPULAR
    ),

  // Get course details
  getCourse: (courseId: string) =>
    apiCall<{ success: boolean; course: GolfCourse; source: string }>(
      `${API_ENDPOINTS.COURSES}/${courseId}`
    ),

  // Add to favorites
  addFavorite: (courseId: string, courseData?: GolfCourse) =>
    apiCall<{ success: boolean; favorite: any }>(`${API_ENDPOINTS.COURSES}/favorites`, {
      method: "POST",
      body: JSON.stringify({ courseId, courseData }),
    }),

  // Remove from favorites
  removeFavorite: (courseId: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.COURSES}/favorites/${courseId}`, {
      method: "DELETE",
    }),

  // Get user's favorites
  getFavorites: () =>
    apiCall<{ success: boolean; courses: GolfCourse[] }>(API_ENDPOINTS.COURSES_FAVORITES),
};
