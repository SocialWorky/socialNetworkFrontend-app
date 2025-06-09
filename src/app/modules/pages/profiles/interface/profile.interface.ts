export interface ProfileData {
  id?: string;
  legend?: string;
  coverImage?: string;
  coverImageMobile?: string;
  dateOfBirth?: string;
  description?: string;
  location?: Location;
  socialNetworks?: SocialNetworks;
  relationshipStatus?: string;
  website?: string;
  phone?: string;
  whatsapp?: Whatsapp;
  sex?: string;
  work?: string;
  school?: string;
  university?: string;
  hobbies?: {
    name?: string;
  };
  interests?: {
    name?: string;
  };
  languages?: {
    name?: string;
  };
  dynamicFields?: any;
}

export interface Location {
  city?: string;
  region?: string;
  country?: string;
}

export interface SocialNetworks {
  nombre?: string;
  link?: string;
  type?: string;
}

export interface Whatsapp {
  number?: string;
  isViewable?: boolean;
}
