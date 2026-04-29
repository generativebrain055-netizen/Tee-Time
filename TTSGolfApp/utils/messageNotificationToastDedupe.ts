/**
 * Prevents duplicate in-app toasts when the same new message is surfaced by both
 * MessageToastListener (unread poll) and NotificationToastListener / foreground push.
 */
const lastShownAtByConversation = new Map<string, number>();
const DEFAULT_WINDOW_MS = 7000;

export function tryConsumeMessageToastSlot(
  conversationId: string,
  windowMs = DEFAULT_WINDOW_MS,
): boolean {
  const id = (conversationId || "").trim();
  if (!id) return true;
  const now = Date.now();
  const prev = lastShownAtByConversation.get(id) ?? 0;
  if (now - prev < windowMs) return false;
  lastShownAtByConversation.set(id, now);
  return true;
}

export function clearMessageToastDedupeForUser(): void {
  lastShownAtByConversation.clear();
}
