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
  additionalDataLike?: AdditionalDataLike;
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

export interface AdditionalDataLike {
  _id: string;
  emoji: string;
  name: string;
  userIdReaction: string;
  userNameReaction: string;
  userAvatarReaction: string;
}
