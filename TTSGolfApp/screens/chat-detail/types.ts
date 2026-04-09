export interface ChatMessage {
  id: string;
  senderId: string | null;
  senderName: string;
  senderImg: string;
  message: string;
  /** Public URL of image attachment when message includes a photo */
  imageUrl?: string | null;
  /** Non-image file attachment */
  fileUrl?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
  time: string;
  isMe: boolean;
  /** True for auto-generated tee time messages (e.g. Tee Time Social welcome) */
  isSystem?: boolean;
}

/** 1:1 chat only: current user vs the other participant */
export interface DirectBlockRelation {
  iBlockedThem: boolean;
  theyBlockedYou: boolean;
}

export interface ChatInfo {
  id: string;
  conversationId?: string;
  recipientId?: string;
  teeTimeId?: string;
  groupId?: string;
  name: string;
  subtitle: string;
  img?: string;
  isGroup?: boolean;
  /** Figma 1379-5818: group header expanded – "N players" and avatar stack */
  participantCount?: number;
  participantAvatars?: string[];
  onHeaderPress?: () => void;
}

export interface CurrentUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface ChatDetailState {
  messageText: string;
  showMenu: boolean;
  messages: ChatMessage[];
  loading: boolean;
  currentUser: CurrentUser | null;
}
