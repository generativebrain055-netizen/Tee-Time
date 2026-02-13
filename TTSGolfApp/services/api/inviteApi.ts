/**
 * Invite API Service
 * Handles all invite-related API calls
 * @module services/api/inviteApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";
import { logger } from "../../utils/logger";
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
  respondToInvite: async (
    inviteId: string,
    response: InviteResponseType,
    message?: string,
  ) => {
    const url = `${API_ENDPOINTS.INVITES}/${inviteId}/respond`;
    
    // Validate inviteId
    if (!inviteId || typeof inviteId !== 'string') {
      const error = new Error("Invalid invite ID");
      logger.error("[inviteApi] respondToInvite - invalid inviteId", {
        inviteId,
        type: typeof inviteId,
      });
      throw error;
    }
    
    console.log("🔵 [inviteApi] respondToInvite CALLED", {
      inviteId,
      response,
      url,
      fullUrl: url,
      hasMessage: !!message,
    });
    
    logger.info("[inviteApi] respondToInvite called", {
      inviteId,
      response,
      url,
      hasMessage: !!message,
      fullUrl: url,
    });
    
    try {
      console.log("🔵 [inviteApi] About to call apiCall with PUT request", {
        url,
        method: "PUT",
        body: { response, message },
      });
      
      const result = await apiCall<{ success: boolean }>(
        url,
        {
          method: "PUT",
          body: JSON.stringify({ response, message }),
        },
      );
      
      console.log("🟢 [inviteApi] respondToInvite SUCCESS", {
        inviteId,
        response,
        success: result.success,
        result,
      });
      
      logger.info("[inviteApi] respondToInvite success", {
        inviteId,
        response,
        success: result.success,
      });
      
      return result;
    } catch (error: any) {
      console.error("🔴 [inviteApi] respondToInvite ERROR", {
        inviteId,
        response,
        url,
        fullUrl: url,
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        name: error.name,
        stack: error.stack,
      });
      
      logger.error("[inviteApi] respondToInvite error", {
        inviteId,
        response,
        url,
        fullUrl: url,
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        name: error.name,
      });
      
      // Provide more helpful error message
      if (error.code === "NETWORK_ERROR" || error.statusCode === 0 || error.code === "TIMEOUT_ERROR") {
        throw new Error(
          "Cannot connect to server. Please check:\n" +
          "1. Backend is running (cd backend && npm run dev)\n" +
          "2. EXPO_PUBLIC_API_URL in .env is set to your computer's IP (not localhost)\n" +
          "3. Your device/simulator can reach the backend"
        );
      }
      
      throw error;
    }
  },

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
