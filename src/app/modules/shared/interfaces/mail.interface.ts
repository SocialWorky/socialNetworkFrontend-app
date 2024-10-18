export interface MailSendValidateData {
  token?: string;
  email?: string;
  password?: string;
  url?: string;
  subject: string;
  title: string;
  greet: string;
  message: string;
  subMessage: string;
  buttonMessage: string;
  template: string;
  templateLogo: string;
}

export enum TemplateEmail {
  RESET_PASSWORD = 'reset-password',
  FORGOT_PASSWORD = 'forgot-password',
  VALIDATE_EMAIL = 'forgot-password',
  WELCOME = 'welcome',
  NOTIFICATION = 'notification'
}