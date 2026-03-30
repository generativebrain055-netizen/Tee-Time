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
