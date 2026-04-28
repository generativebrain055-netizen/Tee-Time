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

const AD_SLOTS_CACHE_TTL_MS = 5 * 60 * 1000;
const AD_SLOTS_POLL_MS = 15 * 1000;
let adSlotsCache: AdSlotsResponse | null = null;
let adSlotsCacheAt = 0;
let inFlight: Promise<AdSlotsResponse> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<(data: AdSlotsResponse) => void>();

function signatureFor(data: AdSlotsResponse | null): string {
  if (!data?.data?.length) return "";
  return [...data.data]
    .sort((a, b) => a.slot_key.localeCompare(b.slot_key))
    .map((s) => `${s.slot_key}|${s.image_url || ""}|${s.link_url || ""}|${s.description || ""}`)
    .join("::");
}

function notifySubscribers(data: AdSlotsResponse): void {
  subscribers.forEach((cb) => {
    try {
      cb(data);
    } catch {
      // Keep fanout resilient; individual subscriber failures should not break updates.
    }
  });
}

function updateCache(next: AdSlotsResponse): void {
  const prevSig = signatureFor(adSlotsCache);
  const nextSig = signatureFor(next);
  adSlotsCache = next;
  adSlotsCacheAt = Date.now();
  if (prevSig !== nextSig) {
    notifySubscribers(next);
  }
}

function ensurePolling(): void {
  if (pollTimer || subscribers.size === 0) return;
  pollTimer = setInterval(() => {
    void fetchAdSlots(true);
  }, AD_SLOTS_POLL_MS);
}

function stopPollingIfIdle(): void {
  if (subscribers.size > 0) return;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function getCachedAdSlots(): AdSlotsResponse | null {
  if (!adSlotsCache) return null;
  if (Date.now() - adSlotsCacheAt >= AD_SLOTS_CACHE_TTL_MS) return null;
  return adSlotsCache;
}

export function getCachedAdSlot(slotKey: string): AdSlotItem | null {
  const cached = getCachedAdSlots();
  if (!cached?.data?.length) return null;
  const slot = cached.data.find((s) => s.slot_key === slotKey && !!s.image_url);
  return slot || null;
}

export async function primeAdSlotsCache(): Promise<void> {
  await fetchAdSlots();
}

export function subscribeAdSlots(onChange: (data: AdSlotsResponse) => void): () => void {
  subscribers.add(onChange);
  if (adSlotsCache) {
    onChange(adSlotsCache);
  }
  ensurePolling();
  return () => {
    subscribers.delete(onChange);
    stopPollingIfIdle();
  };
}

/**
 * Fetch active ad slots (no auth required). Returns only slots that are active and have image_url set.
 */
export async function fetchAdSlots(forceRefresh = false): Promise<AdSlotsResponse> {
  const now = Date.now();
  if (!forceRefresh && adSlotsCache && now - adSlotsCacheAt < AD_SLOTS_CACHE_TTL_MS) {
    return adSlotsCache;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
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
      const empty = { success: true, data: [] };
      updateCache(empty);
      return empty;
    }
    updateCache(data);
    return data;
  } catch (e) {
    logger.warn("[adSlotsApi] Error fetching ad slots", e);
    return { success: false, data: [] };
  } finally {
    inFlight = null;
  }
  })();

  return inFlight;
}
