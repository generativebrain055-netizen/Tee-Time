/**
 * Tee Time API Service
 * Handles all tee time-related API calls
 * @module services/api/teeTimeApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall, buildQueryString } from "./core";
import type {
  TeeTime,
  TeeTimeHistoryEntry,
  CreateTeeTimeRequest,
  TeeTimeHistoryParams,
} from "./types";

export const teeTimeApi = {
  /**
   * Create tee time
   */
  createTeeTime: (data: CreateTeeTimeRequest) =>
    apiCall<{ success: boolean; teeTime: TeeTime }>(API_ENDPOINTS.TEE_TIMES, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Get all tee times
   */
  getTeeTimes: (status?: string) =>
    apiCall<{ success: boolean; teeTimes: TeeTime[] }>(
      status
        ? `${API_ENDPOINTS.TEE_TIMES}?status=${status}`
        : API_ENDPOINTS.TEE_TIMES,
    ),

  /**
   * Get upcoming tee times
   */
  getUpcoming: (limit = 10) =>
    apiCall<{ success: boolean; teeTimes: TeeTime[] }>(
      `${API_ENDPOINTS.TEE_TIMES_UPCOMING}?limit=${limit}`,
    ),

  /**
   * Get tee time details
   */
  getTeeTime: (id: string) =>
    apiCall<{ success: boolean; teeTime: TeeTime }>(
      `${API_ENDPOINTS.TEE_TIMES}/${id}`,
    ),

  /**
   * Cancel tee time
   */
  cancelTeeTime: (id: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.TEE_TIMES}/${id}/cancel`, {
      method: "POST",
    }),

  /**
   * Skip invite and advance to next roster member
   */
  skipInvite: (teeTimeId: string, inviteId: string) =>
    apiCall<{
      success: boolean;
      message: string;
      skippedInviteId: string;
      nextInvite: unknown;
      invites: unknown[];
    }>(`${API_ENDPOINTS.TEE_TIMES}/${teeTimeId}/invites/${inviteId}/skip`, {
      method: "POST",
    }),

  /**
   * Get calendar data
   */
  getCalendar: (start: string, end: string) =>
    apiCall<{ success: boolean; calendar: Record<string, TeeTime[]> }>(
      `${API_ENDPOINTS.TEE_TIMES_CALENDAR}?start=${start}&end=${end}`,
    ),

  /**
   * Get complete tee time history
   */
  getHistory: (params?: TeeTimeHistoryParams) => {
    const query = new URLSearchParams();
    if (params?.filter) query.append("filter", params.filter);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset) query.append("offset", params.offset.toString());
    const queryStr = query.toString();
    return apiCall<{ success: boolean; history: TeeTimeHistoryEntry[] }>(
      `${API_ENDPOINTS.TEE_TIMES_HISTORY}${queryStr ? `?${queryStr}` : ""}`,
    );
  },

  /**
   * Send On-Deck invites as FCFS
   */
  sendOnDeckInvites: (
    teeTimeId: string,
    playerIds: string[],
    deadline?: string,
  ) =>
    apiCall<{ success: boolean; message: string; invites: unknown[] }>(
      `${API_ENDPOINTS.TEE_TIMES}/${teeTimeId}/on-deck-invites`,
      {
        method: "POST",
        body: JSON.stringify({ playerIds, deadline }),
      },
    ),

  /**
   * Set FCFS deadline for all pending invites
   */
  setFCFSDeadline: (teeTimeId: string, deadline: string) =>
    apiCall<{
      success: boolean;
      message: string;
      deadline: string;
      updatedCount: number;
    }>(`${API_ENDPOINTS.TEE_TIMES}/${teeTimeId}/fcfs-deadline`, {
      method: "POST",
      body: JSON.stringify({ deadline }),
    }),
};
