/**
 * Attendance API Service
 * Handles attendance and check-in API calls
 * @module services/api/attendanceApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";
import type { AttendanceRecord, AttendanceSummary } from "./types";

export const attendanceApi = {
  /**
   * Get attendance for a tee time (organizer only)
   */
  getAttendance: (teeTimeId: string) =>
    apiCall<{
      success: boolean;
      checkInAvailable: boolean;
      checkInMessage?: string;
      summary: AttendanceSummary;
      attendance: AttendanceRecord[];
    }>(`${API_ENDPOINTS.TEE_TIMES}/${teeTimeId}/attendance`),

  /**
   * One-tap check-in all
   */
  checkInAll: (teeTimeId: string) =>
    apiCall<{ success: boolean; message: string; checkedIn: number }>(
      `${API_ENDPOINTS.TEE_TIMES}/${teeTimeId}/check-in/all`,
      { method: "POST" },
    ),

  /**
   * Update individual attendance
   */
  updateAttendance: (
    teeTimeId: string,
    attendanceId: string,
    status: "present" | "no_show",
  ) =>
    apiCall<{
      success: boolean;
      message: string;
      attendance: { id: string; status: string; penaltyApplied: boolean };
    }>(`${API_ENDPOINTS.TEE_TIMES}/${teeTimeId}/check-in/${attendanceId}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  /**
   * Cancel own participation
   */
  cancelParticipation: (teeTimeId: string) =>
    apiCall<{ success: boolean; message: string; penaltyApplied: boolean }>(
      `${API_ENDPOINTS.TEE_TIMES}/${teeTimeId}/cancel-participation`,
      { method: "POST" },
    ),
};
