export interface AddReaction {
  authorId: string;
  _idCustomReaction: string;
  isPublications?: boolean;
  isComment?: boolean;
  _idPublication: string;
}

export interface PublicationsReactions {
    _id:            string;
    isPublications: boolean;
    isComment:      boolean;
    user:           User;
    customReaction: CustomReaction;
}

export interface CustomReaction {
    _id:   string;
    name:  string;
    emoji: string;
}

export interface User {
    _id: string;
}
