import { RoleUser } from '../models/roleUser.enum';
import { MailRegisterValidateData } from '../interfaces/mail.interface';

export interface RegisterData {
  username: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: RoleUser;
  mailDataValidate?: MailRegisterValidateData;
}
