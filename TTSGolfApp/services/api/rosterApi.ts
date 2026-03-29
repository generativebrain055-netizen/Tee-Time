/**
 * Roster API Service
 * Handles all roster-related API calls
 * @module services/api/rosterApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall, buildQueryString } from "./core";
import type {
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
  UpdateWaiverWireRequest,
} from "./types";

export const rosterApi = {
  // ============ ROSTER MEMBERS ============

  /**
   * Get user's roster with optional sorting
   */
  getRoster: (sortBy?: SortPreference) => {
    const params = sortBy ? `?sortBy=${sortBy}` : "";
    return apiCall<{ success: boolean; roster: RosterContact[] }>(
      `${API_ENDPOINTS.ROSTER}${params}`,
    );
  },

  /**
   * Get on-deck players
   */
  getOnDeck: () =>
    apiCall<{ success: boolean; onDeck: RosterContact[] }>(
      API_ENDPOINTS.ROSTER_ON_DECK,
    ),

  /**
   * Add contact to roster
   */
  addToRoster: (contact: AddToRosterRequest) =>
    apiCall<{ success: boolean; entry: RosterContact }>(API_ENDPOINTS.ROSTER, {
      method: "POST",
      body: JSON.stringify(contact),
    }),

  /**
   * Remove from roster: main list → moves to On-Deck; On-Deck → deletes row.
   * Use permanent: true to always delete the row (block user, or remove from On Deck tab).
   */
  removeFromRoster: (
    rosterId: string,
    options?: { permanent?: boolean },
  ) => {
    const q =
      options?.permanent === true
        ? `${buildQueryString({ permanent: "true" })}`
        : "";
    return apiCall<{
      success: boolean;
      message?: string;
      action?: "deleted" | "moved_to_on_deck";
      entry?: RosterContact;
    }>(`${API_ENDPOINTS.ROSTER}/${rosterId}${q}`, {
      method: "DELETE",
    });
  },

  /**
   * Reorder roster (drag & drop)
   */
  reorderRoster: (orderedIds: string[]) =>
    apiCall<{ success: boolean }>(API_ENDPOINTS.ROSTER_REORDER, {
      method: "PUT",
      body: JSON.stringify({ orderedIds }),
    }),

  /**
   * Toggle on-deck status
   */
  toggleOnDeck: (rosterId: string, isOnDeck: boolean) =>
    apiCall<{ success: boolean }>(
      `${API_ENDPOINTS.ROSTER}/${rosterId}/on-deck`,
      {
        method: "PUT",
        body: JSON.stringify({ isOnDeck }),
      },
    ),

  /**
   * Move member (drag & drop between roster/on-deck)
   */
  moveMember: (rosterId: string, data: MoveMemberRequest) =>
    apiCall<{ success: boolean; entry: RosterContact }>(
      `${API_ENDPOINTS.ROSTER}/${rosterId}/move`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  /**
   * Update member's group. Pass removeFromGroupId when clearing membership for one group only (multi-group).
   */
  updateMemberGroup: (
    rosterId: string,
    groupId: string | null,
    removeFromGroupId?: string | null,
  ) =>
    apiCall<{ success: boolean; entry: RosterContact }>(
      `${API_ENDPOINTS.ROSTER}/${rosterId}/group`,
      {
        method: "PUT",
        body: JSON.stringify({
          groupId,
          ...(removeFromGroupId != null && removeFromGroupId !== ""
            ? { removeFromGroupId }
            : {}),
        }),
      },
    ),

  /**
   * Get detailed member profile
   */
  getMemberProfile: (rosterId: string) =>
    apiCall<{ success: boolean; profile: MemberProfile }>(
      `${API_ENDPOINTS.ROSTER}/${rosterId}/profile`,
    ),

  /**
   * Get member's playing history
   */
  getMemberHistory: (rosterId: string) =>
    apiCall<{ success: boolean; history: unknown[] }>(
      `${API_ENDPOINTS.ROSTER}/${rosterId}/history`,
    ),

  /**
   * Search users
   */
  searchUsers: (query: string) =>
    apiCall<{ success: boolean; users: unknown[] }>(
      `${API_ENDPOINTS.ROSTER_SEARCH}?q=${encodeURIComponent(query)}`,
    ),

  // ============ GROUPS ============

  /**
   * Get all groups
   */
  getGroups: () =>
    apiCall<{ success: boolean; groups: RosterGroup[] }>(
      `${API_ENDPOINTS.ROSTER}/groups`,
    ),

  /**
   * Get single group details
   */
  getGroup: (groupId: string) =>
    apiCall<{ success: boolean; group: RosterGroup }>(
      `${API_ENDPOINTS.ROSTER}/groups/${groupId}`,
    ),

  /**
   * Create group
   */
  createGroup: (data: CreateGroupRequest) =>
    apiCall<{ success: boolean; group: RosterGroup }>(
      `${API_ENDPOINTS.ROSTER}/groups`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  /**
   * Update group
   */
  updateGroup: (groupId: string, data: Partial<RosterGroup>) =>
    apiCall<{ success: boolean; group: RosterGroup }>(
      `${API_ENDPOINTS.ROSTER}/groups/${groupId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  /**
   * Update group sort preference
   */
  updateGroupSort: (groupId: string, sortBy: SortPreference) =>
    apiCall<{ success: boolean; sortPreference: string }>(
      `${API_ENDPOINTS.ROSTER}/groups/${groupId}/sort`,
      {
        method: "PUT",
        body: JSON.stringify({ sortBy }),
      },
    ),

  /**
   * Get auto-invite members for tee time creation
   */
  getAutoInviteMembers: (groupId: string) =>
    apiCall<{ success: boolean; members: AutoInviteMember[]; count: number }>(
      `${API_ENDPOINTS.ROSTER}/groups/${groupId}/auto-invite`,
    ),

  /**
   * Delete group
   */
  deleteGroup: (groupId: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.ROSTER}/groups/${groupId}`, {
      method: "DELETE",
    }),

  /**
   * Get group members
   */
  getGroupMembers: (groupId: string, sortBy?: string) => {
    const params = sortBy ? `?sortBy=${sortBy}` : "";
    return apiCall<{ success: boolean; members: RosterContact[] }>(
      `${API_ENDPOINTS.ROSTER}/groups/${groupId}/members${params}`,
    );
  },

  /**
   * Add members to a group (Figma 1075-927: Inviting people)
   */
  addMembersToGroup: (groupId: string, memberUserIds: string[]) =>
    apiCall<{ success: boolean; addedCount: number; groupId: string }>(
      `${API_ENDPOINTS.ROSTER}/groups/${groupId}/members`,
      {
        method: "POST",
        body: JSON.stringify({ memberUserIds }),
      },
    ),

  /**
   * Send group invitations (invitees receive notification Figma 1269-977, Accept/Decline)
   */
  inviteToGroup: (groupId: string, memberUserIds: string[]) =>
    apiCall<{ success: boolean; sent: number; groupId: string; groupName?: string }>(
      `${API_ENDPOINTS.ROSTER}/groups/${groupId}/invite`,
      {
        method: "POST",
        body: JSON.stringify({ memberUserIds }),
      },
    ),

  /**
   * Accept a group invitation (from notification)
   */
  acceptGroupInvite: (notificationId: string) =>
    apiCall<{ success: boolean; groupId: string; groupName?: string }>(
      `${API_ENDPOINTS.ROSTER}/groups/accept-invite`,
      {
        method: "POST",
        body: JSON.stringify({ notificationId }),
      },
    ),

  /**
   * Decline a group invitation
   */
  declineGroupInvite: (notificationId: string) =>
    apiCall<{ success: boolean; declined: boolean }>(
      `${API_ENDPOINTS.ROSTER}/groups/decline-invite`,
      {
        method: "POST",
        body: JSON.stringify({ notificationId }),
      },
    ),

  /**
   * Leave a group (Figma 1075-927: removing yourself)
   */
  leaveGroup: (groupId: string) =>
    apiCall<{ success: boolean; removedCount: number; groupId: string }>(
      `${API_ENDPOINTS.ROSTER}/groups/${groupId}/leave`,
      {
        method: "POST",
      },
    ),

  // ============ WAIVER WIRE ============

  /**
   * Get waiver wire for a date
   * @param date - Date in YYYY-MM-DD format
   * @param options - Optional filters: rosterConnectionsOnly, maxDistance, lat, lng
   */
  getWaiverWire: (date: string, options?: {
    rosterConnectionsOnly?: boolean;
    maxDistance?: number;
    lat?: number;
    lng?: number;
  }) => {
    const params = new URLSearchParams({ date });
    if (options?.rosterConnectionsOnly) params.append('rosterConnectionsOnly', 'true');
    if (options?.maxDistance) params.append('maxDistance', options.maxDistance.toString());
    if (options?.lat) params.append('lat', options.lat.toString());
    if (options?.lng) params.append('lng', options.lng.toString());
    return apiCall<{ success: boolean; waiverWire: WaiverWireEntry[] }>(
      `${API_ENDPOINTS.ROSTER}/waiver-wire?${params.toString()}`,
    );
  },

  /**
   * Add to waiver wire
   */
  addToWaiverWire: (data: AddToWaiverWireRequest) =>
    apiCall<{ success: boolean; entry: WaiverWireEntry }>(
      `${API_ENDPOINTS.ROSTER}/waiver-wire`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  /**
   * Update waiver wire entry
   */
  updateWaiverWire: (date: string, data: UpdateWaiverWireRequest) =>
    apiCall<{ success: boolean; entry: WaiverWireEntry }>(
      `${API_ENDPOINTS.ROSTER}/waiver-wire/${date}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  /**
   * Remove from waiver wire
   */
  removeFromWaiverWire: (date: string) =>
    apiCall<{ success: boolean }>(
      `${API_ENDPOINTS.ROSTER}/waiver-wire/${date}`,
      {
        method: "DELETE",
      },
    ),
};
