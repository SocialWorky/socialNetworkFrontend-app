import { Comment } from '@shared/interfaces/publicationView.interface';

export interface ImageOrganizer {
  _id : string;
  url: string;
  urlThumbnail: string;
  urlCompressed: string;
  comments: Comment[];
  type: MediaType;
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video'
}

export enum TypeView {
  PUBLICATION = 'publication',
  COMMENT = 'comment'
}
