import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '@env/environment'
import { MailSendValidateData, TemplateEmail } from '@shared/interfaces/mail.interface';
import { translations } from '@translations/translations';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { AuthService } from '@auth/services/auth.service';
import { UserService } from '@shared/services/core-apis/users.service';
import { Subject, takeUntil } from 'rxjs';
import { User } from '@shared/interfaces/user.interface';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { CenterSocketNotificationsService } from '@shared/services/notifications/centerSocketNotifications.service';
import { Token } from '@shared/interfaces/token.interface';


@Injectable({
  providedIn: 'root'
})
export class EmailNotificationService {
  private baseUrl: string | undefined;

  private mailSendDataValidate: MailSendValidateData = {} as MailSendValidateData;

  private destroy$ = new Subject<void>();

  dataUser: Token | null = null;

  constructor(
    private http: HttpClient,
    private _authService: AuthService,
    private _userService: UserService,
    private _centerSocketNotificationsService: CenterSocketNotificationsService
  ) {
    if(!this._authService.isAuthenticated()) return;
    this.baseUrl = environment.API_URL;
    this.dataUser = this._authService.getDecodedToken();
  }

  async ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.dataUser = await this._authService.getDecodedToken();
  }

  sendNotification(data: MailSendValidateData) {
    const url = `${this.baseUrl}/email/sendNotification`;
    return this.http.post(url, data);
  }

  private sendEmailNotification(data: MailSendValidateData) {
    const url = `${this.baseUrl}/email/sendEmail`;
    return this.http.post(url, data);
  }

  private async userById(_idUser: string): Promise<User>{
      return new Promise<User>((resolve, reject) => {
        this._userService.getUserById(_idUser).pipe(takeUntil(this.destroy$)).subscribe({
          next: (data) => {
            resolve(data);
          },
          error: (error) => {
            console.error('Error getting user by id:', error);
            reject(error);
          }
        });
      });
  }

  sendEmailNotificationReport(publication: PublicationView, reportMessage: string) {

    this.mailSendDataValidate.url = `${environment.BASE_URL}/publication/${publication._id}`;
    this.mailSendDataValidate.subject = translations['email.sendReportPublicationSubject'];
    this.mailSendDataValidate.title = translations['email.sendReportPublicationTitle'];
    this.mailSendDataValidate.greet = translations['email.sendReportPublicationGreet'];
    this.mailSendDataValidate.message = translations['email.sendReportPublicationMessage'];
    this.mailSendDataValidate.subMessage = translations['email.sendReportPublicationSubMessage'] + reportMessage;
    this.mailSendDataValidate.buttonMessage = translations['email.sendReportPublicationButtonMessage'];
    this.mailSendDataValidate.template = TemplateEmail.NOTIFICATION;
    this.mailSendDataValidate.email = this.dataUser?.email;
    this.mailSendDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;

    this.sendNotification(this.mailSendDataValidate).pipe(takeUntil(this.destroy$)).subscribe();

  }

  sendGeneralEmailing(
      email: string,
      subject: string,
      title: string,
      greet: string,
      message: string,
      subMessage: string,
      buttonMessage: string,
      urlSlug: string,
      template: TemplateEmail = TemplateEmail.EMAIL
    ) {
    this.mailSendDataValidate.url = `${environment.BASE_URL}/${urlSlug}`;
    this.mailSendDataValidate.subject = subject;
    this.mailSendDataValidate.title = title;
    this.mailSendDataValidate.greet = greet;
    this.mailSendDataValidate.message = message;
    this.mailSendDataValidate.subMessage = subMessage;
    this.mailSendDataValidate.buttonMessage = buttonMessage;
    this.mailSendDataValidate.template = template;
    this.mailSendDataValidate.email = email;
    this.mailSendDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;

    this.sendEmailNotification(this.mailSendDataValidate).pipe(takeUntil(this.destroy$)).subscribe();
  }

  //TODO: Implementa notificaciones por email y sistema -> solicitud de amistad.
  async sendFriendRequestNotification(_idUser: string) {
    await this.userById(_idUser).then((user) => {
      this.mailSendDataValidate.url = `${environment.BASE_URL}/profile/${this.dataUser?.id}`;
      this.mailSendDataValidate.subject = translations['email.sendFriendRequestSubject'];
      this.mailSendDataValidate.title = translations['email.sendFriendRequestTitle'];
      this.mailSendDataValidate.greet = translations['email.sendFriendRequestGreet'];
      this.mailSendDataValidate.message = translations['email.sendFriendRequestMessage']
      this.mailSendDataValidate.subMessage = `${translations['email.sendFriendRequestSubMessage']} ${this.dataUser?.name}`;
      this.mailSendDataValidate.buttonMessage = `${translations['email.sendFriendRequestButtonMessage']} ${this.dataUser?.name}`;
      this.mailSendDataValidate.template = TemplateEmail.NOTIFICATION;
      this.mailSendDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;
      this.mailSendDataValidate.email = user.email;

      this._centerSocketNotificationsService.senFriendRequestNotification(user);

      this.sendNotification(this.mailSendDataValidate).pipe(takeUntil(this.destroy$)).subscribe();

    });
  }

  async acceptFriendRequestNotification(_idUser: string) {
    await this.userById(_idUser).then((user) => {
      this.mailSendDataValidate.url = `${environment.BASE_URL}/profile/${this.dataUser?.id}`;
      this.mailSendDataValidate.subject = translations['email.acceptFriendRequestSubject'];
      this.mailSendDataValidate.title = translations['email.acceptFriendRequestTitle'];
      this.mailSendDataValidate.greet = translations['email.acceptFriendRequestGreet'];
      this.mailSendDataValidate.message = translations['email.acceptFriendRequestMessage']
      this.mailSendDataValidate.subMessage = `${translations['email.acceptFriendRequestSubMessage']} ${this.dataUser?.name}`;
      this.mailSendDataValidate.buttonMessage = `${translations['email.acceptFriendRequestButtonMessage']} ${this.dataUser?.name}`;
      this.mailSendDataValidate.template = TemplateEmail.NOTIFICATION;
      this.mailSendDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;
      this.mailSendDataValidate.email = user.email;

      this._centerSocketNotificationsService.acceptFriendRequestNotification(user);

      this.sendNotification(this.mailSendDataValidate).pipe(takeUntil(this.destroy$)).subscribe();
    });
  }

  //TODO: Implementa notificaciones por email y sistema -> reaccion a una publicación.
  async reactionsNotification(publication: PublicationView, reaction: CustomReactionList) {

    if (this.dataUser?.id === publication.author._id) return;

    this.mailSendDataValidate.url = `${environment.BASE_URL}/publication/${publication._id}`;
    this.mailSendDataValidate.subject = 'Han reaccionado a tu publicación';
    this.mailSendDataValidate.title = 'Notificación de reacción';
    this.mailSendDataValidate.greet = 'Hola';
    this.mailSendDataValidate.message = 'El usuario ' + this.dataUser?.name + ' ha reaccionado a tu publicación';
    this.mailSendDataValidate.subMessage = 'Su reacción fue: <img src="'+ reaction.emoji +'" width="20px" alt="'+ reaction.name +'"> ' + reaction.name;
    this.mailSendDataValidate.buttonMessage = 'Ver publicación';
    this.mailSendDataValidate.template = TemplateEmail.NOTIFICATION;
    this.mailSendDataValidate.email = publication?.author.email;
    this.mailSendDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;

    this._centerSocketNotificationsService.reactionInPublicationNotification(publication, reaction);

    this.sendNotification(this.mailSendDataValidate).pipe(takeUntil(this.destroy$)).subscribe();

  }

  //TODO: Implementa notificacion por email para recuperar contraseña.
  async sendEmailToRecoverPassword(email: string) {
    this.mailSendDataValidate.url = `${environment.BASE_URL}/auth/reset-password/`;
    this.mailSendDataValidate.subject = translations['email.resetPasswordSubject'];
    this.mailSendDataValidate.title = translations['email.resetPasswordTitle'];
    this.mailSendDataValidate.greet = translations['email.resetPasswordGreet'];
    this.mailSendDataValidate.message = translations['email.resetPasswordMessage'];
    this.mailSendDataValidate.subMessage = translations['email.resetPasswordSubMessage'];
    this.mailSendDataValidate.buttonMessage = translations['email.resetPasswordButtonMessage'];
    this.mailSendDataValidate.template = TemplateEmail.FORGOT_PASSWORD;
    this.mailSendDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;
    this.mailSendDataValidate.email = email;
    return this.mailSendDataValidate;
  }

  //TODO: Implementa notificacion por email para resetear contraseña.
  async sendEmailToResetPassword(email: string, token: string, password: string) {
    this.mailSendDataValidate.url = `${environment.BASE_URL}/auth/login`;
    this.mailSendDataValidate.subject = translations['email.confirmResetPasswordSubject'];
    this.mailSendDataValidate.title = translations['email.confirmResetPasswordTitle'];
    this.mailSendDataValidate.greet = translations['email.confirmResetPasswordGreet'];
    this.mailSendDataValidate.message = translations['email.confirmResetPasswordMessage'];
    this.mailSendDataValidate.subMessage = translations['email.validateEmailSubMessage'];
    this.mailSendDataValidate.buttonMessage = translations['email.confirmResetPasswordButtonMessage'];
    this.mailSendDataValidate.token = token;
    this.mailSendDataValidate.password = password;
    this.mailSendDataValidate.template = TemplateEmail.RESET_PASSWORD;
    this.mailSendDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;
    this.mailSendDataValidate.email = email;
    return this.mailSendDataValidate;
  }

}
