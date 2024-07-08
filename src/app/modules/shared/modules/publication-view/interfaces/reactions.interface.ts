export interface Reactions {
  customReaction: CustomReaction;
  isComment: boolean;
  isPublications: boolean;
  user: UserReaction;
  _id: string;
}

export interface CustomReaction {
  _id: string;
  name: string;
  emoji: string;
}

export interface UserReaction {
  _id: string;
  name: string;
  lastName: string;
  username: string;
  avatar: string;
}