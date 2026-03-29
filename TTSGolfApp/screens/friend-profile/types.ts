/**
 * Friend Profile type definitions
 */
import { DiscoveredUser } from "../../services/api";

export type FriendshipStatus = "none" | "friend" | "requested" | "pending";

export interface FriendProfileData extends Omit<DiscoveredUser, 'friendshipStatus'> {
  friendshipStatus?: FriendshipStatus;
  /** Profile user has blocked the viewer */
  blockedYou?: boolean;
  headerImage?: string;
  /** Optional extended fields if API supports */
  golfVibe?: string;
  drinkOfChoice?: string;
  roundsCount?: number;
  coursesCount?: number;
  recentRounds?: { courseName: string; date: string }[];
  membership?: { name: string; location?: string };
}

export interface FriendProfileRouteParams {
  userId: string;
  user?: DiscoveredUser;
}
 