/**
 * Tee Time Store – caches upcoming tee times for Home/Calendar
 * Uses in-memory cache + optional AsyncStorage for fast first paint.
 * Data is revalidated on focus and pull-to-refresh.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { teeTimeApi } from "../services/api";
import type { TeeTime } from "../services/api";

const CACHE_KEY = "@tts_upcoming_tee_times";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

interface TeeTimeState {
  /** Cached upcoming tee times */
  upcomingTeeTimes: TeeTime[];
  /** When the cache was last fetched (ms) */
  lastFetchedAt: number | null;
  /** True while a network request is in flight */
  isLoading: boolean;
  /** Last error message if fetch failed */
  error: string | null;
  /** Set cached list (e.g. after fetch or from persisted cache) */
  setUpcomingTeeTimes: (list: TeeTime[]) => void;
  /** Fetch from API and update cache + persist */
  fetchUpcoming: (limit?: number) => Promise<void>;
  /** Hydrate from AsyncStorage (call on app init); returns true if cache was applied */
  hydrateFromCache: () => Promise<boolean>;
  /** Clear cache (e.g. on logout) */
  clearCache: () => void;
}

export const useTeeTimeStore = create<TeeTimeState>((set, get) => ({
  upcomingTeeTimes: [],
  lastFetchedAt: null,
  isLoading: false,
  error: null,

  setUpcomingTeeTimes: (list) => {
    set({ upcomingTeeTimes: list });
  },

  fetchUpcoming: async (limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const res = await teeTimeApi.getUpcoming(limit);
      const list = res.teeTimes ?? [];
      set({
        upcomingTeeTimes: list,
        lastFetchedAt: Date.now(),
        isLoading: false,
        error: null,
      });
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ teeTimes: list, at: Date.now() })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load tee times";
      set({
        isLoading: false,
        error: message,
      });
    }
  },

  hydrateFromCache: async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const { teeTimes, at } = JSON.parse(raw);
      if (!Array.isArray(teeTimes) || teeTimes.length === 0) return false;
      const age = Date.now() - (at || 0);
      set({
        upcomingTeeTimes: teeTimes,
        lastFetchedAt: at ?? null,
      });
      return true;
    } catch {
      return false;
    }
  },

  clearCache: async () => {
    set({ upcomingTeeTimes: [], lastFetchedAt: null });
    await AsyncStorage.removeItem(CACHE_KEY);
  },
}));
