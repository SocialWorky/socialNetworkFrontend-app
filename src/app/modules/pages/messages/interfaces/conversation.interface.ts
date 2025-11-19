import { Message, MessageType } from './message.interface';

export interface Conversation {
  userId: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
  isActive: boolean;
  lastMessageType?: MessageType;
}

export interface PaginatedResponse<T> {
  data?: T[];
  messages?: T[];
  conversations?: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MessageWithUser extends Message {
  senderName?: string;
  senderAvatar?: string;
  receiverName?: string;
  receiverAvatar?: string;
}


