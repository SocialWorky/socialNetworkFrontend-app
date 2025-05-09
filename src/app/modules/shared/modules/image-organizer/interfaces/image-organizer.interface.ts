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
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  PROCESSING = 'procesando',
}

export enum TypeView {
  PUBLICATION = 'publication',
  COMMENT = 'comment'
}
