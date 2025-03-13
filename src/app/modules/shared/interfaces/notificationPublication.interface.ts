export interface NotificationNewPublication {
    message:      string;
    publications: Publications;
}

export interface Publications {
    _id:       string;
    content:   string;
    privacy:   string;
    extraData: string;
    createdAt: Date;
    updatedAt: Date;
    fixed:     boolean;
    author:    Author;
}

export interface Author {
    _id:      string;
    username: string;
    name:     string;
    lastName: string;
    avatar:   string;
    email:    string;
}

export interface NotificationUpdatePublication {
    _id:           string;
    content:       string;
    privacy:       string;
    fixed:         boolean;
    createdAt:     Date;
    updatedAt:     Date;
    extraData:     string;
    author:        Author;
    userReceiving: null;
    media:         Media[];
    reaction:      any[];
    taggedUsers:   any[];
    comment:       any[];
}

export interface Media {
    _id:           string;
    url:           string;
    urlThumbnail:  string;
    urlCompressed: string;
    comments:      any[];
}