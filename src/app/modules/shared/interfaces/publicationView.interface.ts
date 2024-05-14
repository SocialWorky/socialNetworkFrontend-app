export interface PublicationView {
    _id:         string;
    content:     string;
    privacy:     string;
    createdAt:   Date;
    updatedAt:   Date;
    author:      Author;
    media:       any[];
    reaction:    any[];
    taggedUsers: any[];
    comment:     any[];
}

export interface Author {
    _id:      string;
    username: string;
    name:     string;
    lastName: string;
    avatar:   string;
}