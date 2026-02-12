/**
 * Invite API Service
 * Handles all invite-related API calls
 * @module services/api/inviteApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";
import type { Invite, InviteResponse, InviteResponseType } from "./types";

export interface CreateInviteRequest {
  userId?: string;
  phone?: string;
  name?: string;
  order?: number;
}

export const inviteApi = {
  /**
   * Create invites
   */
  createInvites: (
    teeTimeId: string,
    invitees: CreateInviteRequest[],
    inviteType?: "roster" | "fcfs" | "manual",
    responseWindow?: number,
    deadline?: string,
  ) =>
    apiCall<{
      success: boolean;
      invites: unknown[];
      message?: string;
      deadline?: string;
    }>(API_ENDPOINTS.INVITES, {
      method: "POST",
      body: JSON.stringify({
        teeTimeId,
        invitees,
        inviteType,
        responseWindow,
        deadline,
      }),
    }),

  /**
   * Create invites from roster
   */
  createFromRoster: (teeTimeId: string, rosterIds?: string[], count?: number) =>
    apiCall<{ success: boolean; invites: unknown[]; count: number }>(
      API_ENDPOINTS.INVITES_FROM_ROSTER,
      {
        method: "POST",
        body: JSON.stringify({ teeTimeId, rosterIds, count }),
      },
    ),

  /**
   * Get invite by ID
   */
  getInviteById: (inviteId: string) =>
    apiCall<{ success: boolean; invite: Invite & { participants?: any[] } }>(
      `${API_ENDPOINTS.INVITES}/${inviteId}`,
    ),

  /**
   * Get pending invites (received)
   */
  getPendingInvites: () =>
    apiCall<{ success: boolean; invites: Invite[] }>(
      API_ENDPOINTS.INVITES_PENDING,
    ),

  /**
   * Get sent invites
   */
  getSentInvites: () =>
    apiCall<{ success: boolean; invites: Invite[] }>(
      API_ENDPOINTS.INVITES_SENT,
    ),

  /**
   * Respond to invite
   */
  respondToInvite: (
    inviteId: string,
    response: InviteResponseType,
    message?: string,
  ) =>
    apiCall<{ success: boolean }>(
      `${API_ENDPOINTS.INVITES}/${inviteId}/respond`,
      {
        method: "PUT",
        body: JSON.stringify({ response, message }),
      },
    ),

  /**
   * Get response history for an invite
   */
  getInviteResponses: (inviteId: string) =>
    apiCall<{ success: boolean; responses: InviteResponse[] }>(
      `${API_ENDPOINTS.INVITES}/${inviteId}/responses`,
    ),

  /**
   * Get user's response history
   */
  getResponseHistory: () =>
    apiCall<{ success: boolean; history: unknown[] }>(
      `${API_ENDPOINTS.INVITES}/history`,
    ),

  /**
   * Cancel invite
   */
  cancelInvite: (inviteId: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.INVITES}/${inviteId}`, {
      method: "DELETE",
    }),

  /**
   * Get waitlist
   */
  getWaitlist: (teeTimeId: string) =>
    apiCall<{ success: boolean; waitlist: unknown[] }>(
      `${API_ENDPOINTS.INVITES}/${teeTimeId}/waitlist`,
    ),
};
