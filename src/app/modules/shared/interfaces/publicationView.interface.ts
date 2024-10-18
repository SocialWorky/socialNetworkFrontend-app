import { ImageOrganizer } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';
import { ExtraData } from '../modules/addPublication/interfaces/createPost.interface';

export interface Publication {
  publications: PublicationView[];
  total: number;
}

export interface PublicationView {
    _id:         string;
    content:     string;
    privacy:     string;
    fixed:       boolean;
    extraData:   ExtraData;
    createdAt:   Date;
    updatedAt:   Date;
    author:      User;
    userReceiving?: User;
    media:       ImageOrganizer[];
    reaction:    any[];
    taggedUsers: any[];
    comment:     Comment[];
    isMyFriend?: boolean;
    isFriendshipPending?: string;
}

export interface EditPublication {
  fixed?: boolean;
  content?: string;
  privacy?: string;
  extraData?: ExtraData;
}

export interface User {
    _id:      string;
    username: string;
    name:     string;
    lastName: string;
    avatar:   string;
    email:    string;
}

export interface MediaFileUpload {
  filename: string;
  filenameThumbnail: string;
  filenameCompressed: string;
}

export interface Comment {
  _id: string;
  content: string;
  createdAt: Date;
  author: User;
  media: ImageOrganizer[];
}

