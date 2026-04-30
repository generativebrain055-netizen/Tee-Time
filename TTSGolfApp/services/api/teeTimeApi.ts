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
   * Organizer updates date/time/course/location (notifies participants via push).
   */
  patchTeeTime: (
    id: string,
    body: Partial<{
      courseName: string;
      courseLocation: string | null;
      teeDate: string;
      teeTime: string;
    }>,
  ) =>
    apiCall<{ success: boolean; teeTime: TeeTime }>(
      `${API_ENDPOINTS.TEE_TIMES}/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
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

  /**
   * Get Open invites (community board) filtered by distance, date, time, and course
   */
  getOpenInvites: (
    lat: number,
    lng: number,
    maxDistance?: number,
    filters?: {
      date?: string; // YYYY-MM-DD
      time?: "morning" | "afternoon" | "evening";
      course?: string;
    }
  ) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
    });
    if (maxDistance) params.append("maxDistance", maxDistance.toString());
    if (filters?.date) params.append("date", filters.date);
    if (filters?.time) params.append("time", filters.time);
    if (filters?.course) params.append("course", filters.course);
    return apiCall<{
      success: boolean;
      teeTimes: Array<{
        id: string;
        courseName: string;
        courseLocation?: string;
        teeDate: string;
        teeTime: string;
        maxPlayers: number;
        status: string;
        distanceRadius: number;
        distance?: number;
        creator: {
          id: string;
          firstName: string;
          lastName: string;
          username?: string;
          avatar?: string;
        };
        participants: Array<{
          userId: string;
          firstName: string;
          lastName: string;
          avatar?: string;
          handicap?: number;
          socialRate?: number;
        }>;
        participantCount: number;
        slotsOpen: number;
      }>;
      count: number;
    }>(`${API_ENDPOINTS.TEE_TIMES_OPEN}?${params.toString()}`);
  },

  /**
   * Join an Open invite (community board)
   */
  joinOpenInvite: (teeTimeId: string) =>
    apiCall<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.TEE_TIMES}/${teeTimeId}/join`,
      { method: "POST" },
    ),
};
