export interface CreatePost {
  content: string;
  type?: string;
  privacy?: string;
  authorId: string;
  idPublication?: string;
  extraData?: ExtraData;
}

export interface ExtraData {
  locations?: Location;
}

export interface Location {
  title: string;
  urlMap: string;
}
