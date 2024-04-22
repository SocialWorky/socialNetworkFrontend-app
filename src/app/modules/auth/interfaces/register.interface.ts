import { RoleUser } from '../models/roleUser.enum';

export interface RegisterData {
  username: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: RoleUser;
}