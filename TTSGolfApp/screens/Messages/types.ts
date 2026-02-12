/**
 * Message tab list item types (All, Tee Times, Groups)
 */

export type MessageTab = "All" | "Tee Times" | "Groups";

/** Row for "All" tab - 1:1 conversation */
export interface AllConversationItem {
  id: string;
  type: "all";
  recipientId: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread?: number;
}

/** Row for "Tee Times" tab - tee time thread */
export interface TeeTimeConversationItem {
  id: string;
  type: "teeTime";
  teeTimeId: string;
  title: string;
  courseName: string;
  courseLocation?: string;
  teeDate: string;
  teeTime: string;
  participantCount: number;
  participantInitials?: string;
  participantAvatars?: string[];
  lastMessage: string;
  lastMessageTime: string;
}

/** Row for "Groups" tab - group thread */
export interface GroupConversationItem {
  id: string;
  type: "group";
  groupId: string;
  name: string;
  avatar?: string;
  initials: string;
  color?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread?: number;
  /** For expanded chat header (Figma 1379-5818, 1269-2492) */
  participantCount?: number;
  participantAvatars?: string[];
}

export type ConversationItem =
  | AllConversationItem
  | TeeTimeConversationItem
  | GroupConversationItem;
