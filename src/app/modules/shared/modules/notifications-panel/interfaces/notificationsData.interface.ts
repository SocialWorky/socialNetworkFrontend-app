export interface NotificationsData {
  additionalData: string;
  content: string;
  createdAt: Date;
  link: string;
  read: boolean;
  type: string;
  userId: string;
  _id: string;
  // ADDITIONAL PROPERTY
  icon?: string;
  additionalDataComment?: AdditionalDataComment;
}

export interface AdditionalDataComment {
  comment: string;
  postId: string;
  userIdComment: string;
  avatarComment: string;
  nameComment: string;
  userIdReceiver: string;
  avatarReceiver: string;
  nameReceiver: string;
}
