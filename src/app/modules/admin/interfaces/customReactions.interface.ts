export interface CreateCustomReaction {
  name: string;
  emoji: string; // url
}

export interface CustomReactionList {
  _id: string,
  name: string,
  emoji: string,
}