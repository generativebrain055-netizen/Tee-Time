/**
 * Ad slots API – public endpoint (no auth). Used for loading-screen sponsor and banner ads.
 * @module services/api/adSlotsApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { logger } from "../../utils/logger";

/** Matches admin "Ads preview": image as background + description overlay. Max description length matches admin. */
export const AD_DESCRIPTION_MAX_LENGTH = 80;

export type AdSlotItem = {
  slot_key: string;
  image_url: string | null;
  link_url: string | null;
  /** Alt text / tagline shown with the ad (same as admin description). */
  description: string | null;
};

export type AdSlotsResponse = {
  success: boolean;
  data: AdSlotItem[];
};

/**
 * Fetch active ad slots (no auth required). Returns only slots that are active and have image_url set.
 */
export async function fetchAdSlots(): Promise<AdSlotsResponse> {
  try {
    const res = await fetch(API_ENDPOINTS.AD_SLOTS, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = (await res.json().catch(() => ({}))) as AdSlotsResponse;
    if (!res.ok) {
      logger.warn("[adSlotsApi] Failed to load ad slots", res.status, data);
      return { success: false, data: [] };
    }
    if (!data.success || !Array.isArray(data.data)) {
      return { success: true, data: [] };
    }
    return data;
  } catch (e) {
    logger.warn("[adSlotsApi] Error fetching ad slots", e);
    return { success: false, data: [] };
  }
}
