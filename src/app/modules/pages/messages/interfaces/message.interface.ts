export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  content: string;
  timestamp: Date;
  type: string;
  status?: string;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface CreateMessage {
  receiverId: string;
  content: string;
  type: string;
}

export interface UpdateMessage {
  content?: string;
  status?: string;
  isRead?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
}
