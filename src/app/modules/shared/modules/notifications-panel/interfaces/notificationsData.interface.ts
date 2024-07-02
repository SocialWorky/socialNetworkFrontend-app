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
  additionalDataFriendRequest?: AdditionalDataFriendRequest;
  additionalDataFriendAccept?: AdditionalDataFriendAccept;
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

export interface AdditionalDataFriendRequest {
  sendUserId: string;
  sendUserName: string;
  sendUserAvatar: string;
}

export interface AdditionalDataFriendAccept {
  acceptUserId: string;
  acceptUserName: string;
  acceptUserAvatar: string;
}
