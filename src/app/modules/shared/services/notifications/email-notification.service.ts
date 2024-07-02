import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '@env/environment'
import { MailSendValidateData, TemplateEmail } from '@shared/interfaces/mail.interface';
import { translations } from '@translations/translations';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { AuthService } from '@auth/services/auth.service';
import { UserService } from '@shared/services/users.service';
import { Subject, takeUntil } from 'rxjs';
import { User } from '@shared/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class EmailNotificationService {
  private baseUrl: string;

  private token: string;

  private mailSendDataValidate: MailSendValidateData = {} as MailSendValidateData;

  private destroy$ = new Subject<void>();

  dataUser = this._authService.getDecodedToken();

  private getHeaders(token: string): HttpHeaders {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  constructor(
    private http: HttpClient,
    private _authService: AuthService,
    private _userService: UserService
  ) {
    this.baseUrl = environment.API_URL;
    this.token = localStorage.getItem('token') || '';
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  sendNotification(data: MailSendValidateData) {
    const url = `${this.baseUrl}/email/sendNotification`;
    const headers = this.getHeaders(this.token);
    return this.http.post(url, data, { headers });
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

    this.sendNotification(this.mailSendDataValidate).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        console.log(data);
      },
      error: (error) => {
        console.error('Error sending email:', error);
      }
    });

  }

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
      this.mailSendDataValidate.email = user.email;

      this.sendNotification(this.mailSendDataValidate).pipe(takeUntil(this.destroy$)).subscribe({
        next: (data) => {
          console.log(data);
        },
        error: (error) => {
          console.error('Error sending email:', error);
        }
      });
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
      this.mailSendDataValidate.email = user.email;

      this.sendNotification(this.mailSendDataValidate).pipe(takeUntil(this.destroy$)).subscribe({
        next: (data) => {
          console.log(data);
        },
        error: (error) => {
          console.error('Error sending email:', error);
        }
      });
    });
  }

}
