export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImg: string;
  message: string;
  time: string;
  isMe: boolean;
}

export interface ChatInfo {
  id: string;
  recipientId?: string;
  name: string;
  subtitle: string;
  img?: string;
  isGroup?: boolean;
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
