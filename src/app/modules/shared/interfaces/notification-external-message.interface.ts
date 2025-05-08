export interface ExternalMessage {
    userId:      string;
    title:       string;
    body:        string;
    data:        Data;
    idReference: string;
    type:        string;
    response:    string;
}

export interface Data {
    originalname: string;
    filename:     string;
    optimized:    string;
    thumbnail:    string;
    userId:       string;
}
