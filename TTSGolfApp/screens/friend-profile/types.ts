/**
 * Friend Profile type definitions
 */
import { DiscoveredUser } from "../../services/api";

export type FriendshipStatus = "none" | "friend" | "requested" | "pending";

export interface FriendProfileData extends DiscoveredUser {
    friendshipStatus?: FriendshipStatus;
}

export interface FriendProfileRouteParams {
    userId: string;
    user?: DiscoveredUser;
}
 