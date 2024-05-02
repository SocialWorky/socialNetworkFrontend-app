import { RoleUser } from '../models/roleUser.enum';
import { MailSendValidateData } from '../../shared/interfaces/mail.interface';

export interface RegisterData {
  username: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: RoleUser;
  mailDataValidate?: MailSendValidateData;
}
