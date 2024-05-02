export interface MailSendValidateData {
  email?: string;
  token?: string;
  password?: string;
  url?: string;
  subject: string;
  title: string;
  greet: string;
  message: string;
  subMessage: string;
  buttonMessage: string;
}