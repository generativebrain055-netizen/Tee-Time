/**
 * Tee time status shown in lists/cards. When every slot is filled but the API
 * still has pending/in_progress (e.g. before checkAndUpdateStatus runs), show Confirmed.
 */
export function getDisplayTeeTimeStatus(tt: {
  status: string;
  maxPlayers?: number;
  participantCount?: number;
  slotsOpen?: number | null;
}): string {
  const raw = String(tt.status ?? "").toLowerCase();
  const max = Number(tt.maxPlayers);
  let full = false;
  if (tt.slotsOpen !== undefined && tt.slotsOpen !== null) {
    full = tt.slotsOpen === 0;
  } else if (Number.isFinite(max) && max > 0 && typeof tt.participantCount === "number") {
    full = tt.participantCount >= max;
  }
  if (full && (raw === "in_progress" || raw === "pending")) {
    return "confirmed";
  }
  return tt.status;
}
