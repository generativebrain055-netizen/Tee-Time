/**
 * Global Search API (Figma 795-6009, 791-1184, 791-1219, 791-1314, 791-1412, 795-5958)
 */
import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";

export interface SearchUser {
  id: string;
  phone?: string;
  name: string;
  username?: string;
  avatar?: string;
  handicap?: number;
  location?: string | null;
  homeCourse?: string | null;
  zipCode?: string | null;
}

export interface SearchTeeTime {
  id: string;
  courseName: string;
  courseLocation?: string;
  teeDate: string;
  teeTime: string;
  status: string;
  maxPlayers?: number;
}

export interface SearchGroup {
  id: string;
  name: string;
  color?: string;
  description?: string | null;
  memberCount: number;
}

export interface SearchCourse {
  id: string;
  name: string;
  location?: string;
  city?: string;
  state?: string;
}

export interface GlobalSearchResult {
  users: SearchUser[];
  teeTimes: SearchTeeTime[];
  groups: SearchGroup[];
  courses: SearchCourse[];
}

export const searchApi = {
  search: (q: string) =>
    apiCall<{ success: boolean } & GlobalSearchResult>(
      `${API_ENDPOINTS.SEARCH}?q=${encodeURIComponent(q.trim())}`,
    ),
};
