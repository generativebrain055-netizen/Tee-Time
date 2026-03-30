import type { RosterContact } from "../services/api/types/roster";

/**
 * Group `memberCount` from the API is total people in the group including the current user
 * (organizer + members). Product copy lists how many *other* people are in the group.
 */
export function otherPeopleInGroupCount(totalIncludingSelf: number | null | undefined): number {
  const n =
    typeof totalIncludingSelf === "number" && !Number.isNaN(totalIncludingSelf)
      ? totalIncludingSelf
      : 0;
  return Math.max(0, n - 1);
}

/**
 * Group member lists for the signed-in user should show everyone except themselves
 * (match by `contact.userId`). Phone-only rows without `userId` are kept.
 */
export function rosterGroupMembersExceptSelf(
  members: RosterContact[],
  currentUserId: string | undefined | null,
): RosterContact[] {
  const uid = typeof currentUserId === "string" ? currentUserId.trim() : "";
  if (!uid) return members;
  return members.filter((m) => String(m.contact?.userId ?? "") !== uid);
}
