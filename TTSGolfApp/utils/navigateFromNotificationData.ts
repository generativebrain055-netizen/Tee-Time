/**
 * Central routing for in-app notification rows and OS push notification taps.
 * Push payloads from Expo/FCM use string values — use normalizePushNotificationData first.
 */

export type NotificationNavigateFn = (
  screen: string,
  params?: Record<string, unknown>,
) => void;

function tryParseJsonString(s: string): Record<string, unknown> | null {
  try {
    const p = JSON.parse(s);
    return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

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
 * Merge platform/backend quirks: nested JSON strings, snake_case, missing `type` when `inviteId` exists.
 * Call on raw `content.data` before `normalizePushNotificationData`.
 */
export function prepareNotificationDataForNavigation(
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  let out: Record<string, unknown> = { ...raw };

  const dataStr = out.data;
  if (typeof dataStr === "string") {
    const inner = tryParseJsonString(dataStr);
    if (inner) {
      out = { ...out, ...inner };
    }
  }

  if (out.invite_id != null && out.inviteId == null) {
    out.inviteId = out.invite_id;
  }
  if (out.tee_time_id != null && out.teeTimeId == null) {
    out.teeTimeId = out.tee_time_id;
  }
  if (out.conversation_id != null && out.conversationId == null) {
    out.conversationId = out.conversation_id;
  }
  if (out.notificationType != null && out.type == null) {
    out.type = out.notificationType;
  }

  const inviteId = out.inviteId;
  const hasInviteId = inviteId !== null && inviteId !== undefined && String(inviteId).length > 0;
  if (!out.type && hasInviteId) {
    out.type = "tee_time_invite";
  }

  return normalizePushNotificationData(out);
}

/**
 * Navigate based on API / push `data` (expects `type` and related ids).
 * @returns true if a `navigate()` was invoked (stack update scheduled).
 */
export function navigateFromNotificationData(
  navigate: NotificationNavigateFn,
  rawData: Record<string, unknown> | null | undefined,
): boolean {
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
      return true;
    }
    return false;
  }

  if (dataType === "friend_request" && d.senderId) {
    navigate("FriendProfile", { userId: String(d.senderId) });
    return true;
  }
  if (dataType === "friend_accepted" && d.userId) {
    navigate("FriendProfile", { userId: String(d.userId) });
    return true;
  }

  if (dataType === "group_invite" && d.groupId) {
    navigate("GroupProfile", { groupId: String(d.groupId) });
    return true;
  }

  if (dataType === "tee_time_invite" || dataType === "spot_opened") {
    if (d.teeTimeId) {
      navigate("TeeTimeDetail", { teeTimeId: String(d.teeTimeId) });
    } else if (d.inviteId) {
      navigate("InviteDetail", { inviteId: String(d.inviteId) });
    } else {
      navigate("Invites");
    }
    return true;
  }

  if (dataType === "fcfs_deadline" && d.teeTimeId) {
    navigate("TeeTimeDetail", { teeTimeId: String(d.teeTimeId) });
    return true;
  }

  if (dataType === "tee_time_booked") {
    if (d.conversationId) {
      navigate("ChatDetail", {
        chatInfo: {
          conversationId: String(d.conversationId),
          teeTimeId: d.teeTimeId != null ? String(d.teeTimeId) : undefined,
          id:
            d.teeTimeId != null
              ? String(d.teeTimeId)
              : String(d.conversationId),
          name:
            typeof d.courseName === "string" && String(d.courseName).trim()
              ? String(d.courseName).trim()
              : "Tee time",
          subtitle: "Group chat",
          isGroup: true,
        },
      });
      return true;
    }
    if (d.teeTimeId) {
      navigate("ChatDetail", {
        chatInfo: {
          teeTimeId: String(d.teeTimeId),
          id: String(d.teeTimeId),
          name:
            typeof d.courseName === "string" && String(d.courseName).trim()
              ? String(d.courseName).trim()
              : "Tee time",
          subtitle: "Group chat",
          isGroup: true,
        },
      });
      return true;
    }
    return false;
  }

  if (dataType === "no_show") {
    navigate("Profile");
    return true;
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
      return true;
    }
    return false;
  }

  if (dataType === "waiver_wire") {
    navigate("WaiverWire");
    return true;
  }

  if (dataType === "tee_time_response" && d.inviteId) {
    navigate("InviteDetail", { inviteId: String(d.inviteId) });
    return true;
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
    return true;
  }

  if (d.teeTimeId) {
    navigate("TeeTimeDetail", { teeTimeId: String(d.teeTimeId) });
    return true;
  }

  if (d.inviteId) {
    navigate("InviteDetail", { inviteId: String(d.inviteId) });
    return true;
  }

  return false;
}
