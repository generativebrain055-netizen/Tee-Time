/**
 * Draft (QR Code) API Service
 * Handles QR code scanning for "Get Drafted" feature
 * @module services/api/draftApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";
import type { DraftQRCode, ScanResult } from "./types";

export const draftApi = {
  /**
   * Get or generate QR code for "Get Drafted"
   */
  getQRCode: () =>
    apiCall<{ success: boolean; qrCode: DraftQRCode }>(API_ENDPOINTS.DRAFT_QR),

  /**
   * Regenerate QR code (invalidates previous codes)
   */
  regenerateQRCode: () =>
    apiCall<{ success: boolean; qrCode: DraftQRCode; message: string }>(
      API_ENDPOINTS.DRAFT_QR_REGENERATE,
      { method: "POST" },
    ),

  /**
   * Scan and validate a QR code
   */
  scanQRCode: (qrData: string) =>
    apiCall<ScanResult>(API_ENDPOINTS.DRAFT_SCAN, {
      method: "POST",
      body: JSON.stringify({ qrData }),
    }),

  /**
   * Confirm adding scanned user to On-Deck
   */
  confirmDraft: (userId: string) =>
    apiCall<{
      success: boolean;
      message: string;
      entry: { id: string; userId: string; isOnDeck: boolean };
    }>(API_ENDPOINTS.DRAFT_CONFIRM, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  /**
   * Get scan history - who scanned your QR code
   */
  getScanHistory: (limit = 20, offset = 0) =>
    apiCall<{
      success: boolean;
      history: Array<{
        id: string;
        scannerId: string;
        scannerName: string;
        scannerAvatar?: string;
        scannerHandicap?: number;
        wasAddedToRoster: boolean;
        scannedAt: string;
      }>;
      pagination: { limit: number; offset: number; hasMore: boolean };
    }>(`${API_ENDPOINTS.DRAFT_HISTORY}?limit=${limit}&offset=${offset}`),
};
