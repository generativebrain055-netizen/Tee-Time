/**
 * Course API Service
 * Handles all course-related API calls
 * @module services/api/courseApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";
import type { GolfCourse } from "./types";

export const courseApi = {
  /**
   * Search courses
   */
  searchCourses: (query: string, lat?: number, lng?: number) => {
    const params = new URLSearchParams({ q: query });
    if (lat) params.append("lat", lat.toString());
    if (lng) params.append("lng", lng.toString());
    return apiCall<{ success: boolean; courses: GolfCourse[]; source: string }>(
      `${API_ENDPOINTS.COURSES_SEARCH}?${params.toString()}`,
    );
  },

  /**
   * Get nearby courses
   */
  getNearbyCourses: (lat: number, lng: number, radius?: number) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
    });
    if (radius) params.append("radius", radius.toString());
    return apiCall<{ success: boolean; courses: GolfCourse[]; source: string }>(
      `${API_ENDPOINTS.COURSES_NEARBY}?${params.toString()}`,
    );
  },

  /**
   * Get popular courses
   */
  getPopularCourses: (limit?: number) =>
    apiCall<{ success: boolean; courses: GolfCourse[] }>(
      limit
        ? `${API_ENDPOINTS.COURSES_POPULAR}?limit=${limit}`
        : API_ENDPOINTS.COURSES_POPULAR,
    ),

  /**
   * Get course details
   */
  getCourse: (courseId: string) =>
    apiCall<{ success: boolean; course: GolfCourse; source: string }>(
      `${API_ENDPOINTS.COURSES}/${courseId}`,
    ),

  /**
   * Add to favorites
   */
  addFavorite: (courseId: string, courseData?: GolfCourse) =>
    apiCall<{ success: boolean; favorite: unknown }>(
      `${API_ENDPOINTS.COURSES}/favorites`,
      {
        method: "POST",
        body: JSON.stringify({ courseId, courseData }),
      },
    ),

  /**
   * Remove from favorites
   */
  removeFavorite: (courseId: string) =>
    apiCall<{ success: boolean }>(
      `${API_ENDPOINTS.COURSES}/favorites/${courseId}`,
      { method: "DELETE" },
    ),

  /**
   * Get user's favorites
   */
  getFavorites: () =>
    apiCall<{ success: boolean; courses: GolfCourse[] }>(
      API_ENDPOINTS.COURSES_FAVORITES,
    ),
};
