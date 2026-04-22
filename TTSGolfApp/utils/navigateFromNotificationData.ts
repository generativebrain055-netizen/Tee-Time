/**
 * Central routing for in-app notification rows and OS push notification taps.
 * Push payloads from Expo/FCM use string values — use normalizePushNotificationData first.
 */

export type NotificationNavigateFn = (
  screen: string,
  params?: Record<string, unknown>,
) => void;

/** Expo / FCM flatten all `data` values to strings; coerce booleans and numbers we rely on. */
export function normalizePushNotificationData(
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = { ...raw };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v !== "string") continue;
    if (v === "true") {
      out[k] = true;
      continue;
    }
    if (v === "false") {
      out[k] = false;
      continue;
    }
    if (
      /^(spotsRemaining|hoursRemaining|maxPlayers|cancelledPlayerId)$/.test(k) ||
      k === "accepted"
    ) {
      const n = Number(v);
      if (!Number.isNaN(n)) out[k] = n;
    }
  }
  return out;
}

/**
 * Navigate based on API / push `data` (expects `type` and related ids).
 */
export function navigateFromNotificationData(
  navigate: NotificationNavigateFn,
  rawData: Record<string, unknown> | null | undefined,
): void {
  const d = rawData && typeof rawData === "object" ? rawData : {};
  const dataType = d.type as string | undefined;

  if (
    dataType === "organizer_fill_warning" ||
    dataType === "tee_time_not_filled" ||
    dataType === "organizer_invite_more" ||
    dataType === "roster_exhausted"
  ) {
    if (d.teeTimeId) {
      const unfilled =
        dataType === "tee_time_not_filled" ||
        dataType === "organizer_fill_warning" ||
        dataType === "organizer_invite_more";
      navigate("SelectOnDeck", {
        teeTimeId: String(d.teeTimeId),
        spotsRemaining: (d.spotsRemaining as number) ?? 1,
        courseName: d.courseName as string | undefined,
        teeDate: d.teeDate as string | undefined,
        teeTime: d.teeTime as string | undefined,
        unfilledSlotAlert: unfilled,
      });
    }
    return;
  }

  if (dataType === "friend_request" && d.senderId) {
    navigate("FriendProfile", { userId: String(d.senderId) });
    return;
  }
  if (dataType === "friend_accepted" && d.userId) {
    navigate("FriendProfile", { userId: String(d.userId) });
    return;
  }

  if (dataType === "group_invite" && d.groupId) {
    navigate("GroupProfile", { groupId: String(d.groupId) });
    return;
  }

  if (dataType === "tee_time_invite" || dataType === "spot_opened") {
    if (d.inviteId) {
      navigate("InviteDetail", { inviteId: String(d.inviteId) });
    } else if (d.teeTimeId) {
      navigate("TeeTimeDetail", { teeTimeId: String(d.teeTimeId) });
    } else {
      navigate("Invites");
    }
    return;
  }

  if (dataType === "fcfs_deadline" && d.teeTimeId) {
    navigate("TeeTimeDetail", { teeTimeId: String(d.teeTimeId) });
    return;
  }

  if (dataType === "no_show") {
    navigate("Profile");
    return;
  }

  if (
    dataType === "roster_add" ||
    dataType === "roster_removed" ||
    dataType === "group_updated" ||
    dataType === "group_deleted" ||
    dataType === "on_deck_added" ||
    dataType === "on_deck_removed"
  ) {
    if (d.ownerId) {
      navigate("FriendProfile", { userId: String(d.ownerId) });
    }
    return;
  }

  if (dataType === "waiver_wire") {
    navigate("WaiverWire");
    return;
  }

  if (
    (dataType === "tee_time_response" ||
      dataType === "player_cancelled" ||
      dataType === "check_in_reminder") &&
    d.teeTimeId
  ) {
    navigate("TeeTimeDetail", {
      teeTimeId: String(d.teeTimeId),
      autoOpenCheckIn: dataType === "check_in_reminder",
    });
    return;
  }

  if (d.teeTimeId) {
    navigate("TeeTimeDetail", { teeTimeId: String(d.teeTimeId) });
  }
}
