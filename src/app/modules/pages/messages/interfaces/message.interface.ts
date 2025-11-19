export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  content: string;
  urlFile?: string;
  timestamp: string;
  type: MessageType;
  status: MessageStatus;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  updatedAt: string;
  replyTo?: string;
  replyMessage?: Message;
}

export interface CreateMessageDto {
  receiverId: string;
  content: string;
  type?: MessageType;
  urlFile?: string;
  replyTo?: string;
}

export interface UpdateMessageDto {
  content?: string;
  type?: MessageType;
  urlFile?: string;
}

export interface MarkAsReadDto {
  chatId: string;
  senderId: string;
}
