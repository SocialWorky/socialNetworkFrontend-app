export interface FriendsStatus {
    id:        string;
    status:    string;
    isBlocked: boolean;
    requester: UserData;
    receiver:  UserData;
    blockedBy: null;
}

export interface UserData {
    _id:      string;
    name:     string;
    lastName: string;
    emial:    string;
    avatar:   null | string;
    role:     string;
}