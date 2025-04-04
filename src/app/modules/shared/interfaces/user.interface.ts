import { ProfileData } from '../../pages/profiles/interface/profile.interface';

export interface User {
  _id: string;
  username: string;
  name: string;
  lastName: string;
  email: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  avatar: string;
  createdAt: string;
  updatedAt: string;
  profile: ProfileData;
  isDarkMode: boolean;
}
