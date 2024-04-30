export interface LoginData {
  email: string;
  password: string;
}

export interface LoginDataGloogle {
  token: string;
  username: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginResponseGoogle {
  email: string;
  family_name: string;
  given_name: string;
  picture: string;
  name: string;
}