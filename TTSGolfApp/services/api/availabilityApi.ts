import { API_URL } from '../../config/api';
import { apiCall } from './core';

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type TimeSlotType = 'morning' | 'late_morning' | 'afternoon' | 'late_afternoon' | 'evening';

export interface TimeSlot {
  day_of_week: DayOfWeek;
  time_slot: TimeSlotType;
}

export interface AvailabilitySlot {
  id?: string;
  user_id?: string;
  day_of_week: DayOfWeek;
  time_slot: TimeSlotType;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilityResponse {
  success: boolean;
  data?: AvailabilitySlot[];
  message?: string;
}

// Availability API Service
export const availabilityApi = {
  // Get current user's availability
  async getUserAvailability(): Promise<AvailabilityResponse> {
    try {
      console.log('[AvailabilityAPI] Fetching user availability from:', `${API_URL}/api/availability`);
      const response = await apiCall<AvailabilityResponse>(`${API_URL}/api/availability`, {
        method: 'GET',
      });
      console.log('[AvailabilityAPI] Response received:', response);
      return response;
    } catch (error: any) {
      console.error('[AvailabilityAPI] Error fetching availability:', error);
      console.error('[AvailabilityAPI] Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        code: error.code,
      });
      throw error;
    }
  },

  // Save user availability
  async saveUserAvailability(availability: TimeSlot[]): Promise<AvailabilityResponse> {
    try {
      console.log('[AvailabilityAPI] Saving availability:', availability);
      const response = await apiCall<AvailabilityResponse>(`${API_URL}/api/availability`, {
        method: 'POST',
        body: JSON.stringify({ availability }),
      });
      console.log('[AvailabilityAPI] Save response:', response);
      return response;
    } catch (error: any) {
      console.error('[AvailabilityAPI] Error saving availability:', error);
      throw error;
    }
  },

  // Clear user availability
  async clearAvailability(): Promise<AvailabilityResponse> {
    try {
      const response = await apiCall<AvailabilityResponse>(`${API_URL}/api/availability`, {
        method: 'DELETE',
      });
      return response;
    } catch (error: any) {
      console.error('[AvailabilityAPI] Error clearing availability:', error);
      throw error;
    }
  },

  // Get availability for multiple users (friends/roster)
  async getMultipleUsersAvailability(userIds: string[]): Promise<{
    success: boolean;
    data?: Record<string, { dayOfWeek: DayOfWeek; timeSlot: TimeSlotType }[]>;
  }> {
    try {
      const response = await apiCall<{
        success: boolean;
        data: Record<string, { dayOfWeek: DayOfWeek; timeSlot: TimeSlotType }[]>;
      }>(`${API_URL}/api/availability/users`, {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      });
      return response;
    } catch (error: any) {
      console.error('[AvailabilityAPI] Error fetching multiple availability:', error);
      throw error;
    }
  },
};
