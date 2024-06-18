import { ExtraData } from '../modules/addPublication/interfaces/createPost.interface';

export interface PublicationView {
    _id:         string;
    content:     string;
    privacy:     string;
    extraData:   ExtraData;
    createdAt:   Date;
    updatedAt:   Date;
    author:      User;
    userReceiving?: User;
    media:       any[];
    reaction:    any[];
    taggedUsers: any[];
    comment:     any[];
    isMyFriend?: boolean;
    isFriendshipPending?: string;
}

export interface User {
    _id:      string;
    username: string;
    name:     string;
    lastName: string;
    avatar:   string;
}

export interface MediaFileUpload {
  filename: string;
  filenameThumbnail: string;
  filenameCompressed: string;
}
