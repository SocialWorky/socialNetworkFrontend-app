import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '@env/environment';
import { UserService } from '@shared/services/core-apis/users.service';
import { User } from '@shared/interfaces/user.interface';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { MailSendValidateData, TemplateEmail } from '@shared/interfaces/mail.interface';
import { translations } from '@translations/translations';
import { 
  UserFilters, 
  UserUpdateRequest, 
  UserListResponse,
  UserRole,
  UserStatus,
  SendVerificationEmailRequest
} from '@admin/interfaces/user-management.interface';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private usersSubject = new BehaviorSubject<User[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private totalUsersSubject = new BehaviorSubject<number>(0);

  public users$ = this.usersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public totalUsers$ = this.totalUsersSubject.asObservable();

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private emailNotificationService: EmailNotificationService,
    private logService: LogService
  ) {}

  getUsers(filters: UserFilters = {}, page: number = 1, limit: number = 10): Observable<UserListResponse> {
    this.loadingSubject.next(true);
    
    return new Observable(observer => {
      this.userService.getAllUsers().subscribe({
        next: (users) => {
          // Apply filters
          let filteredUsers = users;
          
          if (filters.search) {
            const search = filters.search.toLowerCase();
            filteredUsers = users.filter(user => 
              user.username.toLowerCase().includes(search) ||
              user.email.toLowerCase().includes(search) ||
              user.name.toLowerCase().includes(search) ||
              user.lastName.toLowerCase().includes(search)
            );
          }
          
          if (filters.role) {
            filteredUsers = filteredUsers.filter(user => user.role === filters.role);
          }
          
          if (filters.status) {
            filteredUsers = filteredUsers.filter(user => {
              if (filters.status === UserStatus.ACTIVE) return user.isActive && user.isVerified;
              if (filters.status === UserStatus.INACTIVE) return !user.isActive;
              if (filters.status === UserStatus.PENDING_VERIFICATION) return !user.isVerified;
              return true;
            });
          }
          
          // Apply pagination
          const total = filteredUsers.length;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
          
          const response: UserListResponse = {
            users: paginatedUsers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          };
          
          this.usersSubject.next(response.users);
          this.totalUsersSubject.next(response.total);
          this.loadingSubject.next(false);
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          this.logService.log(
            LevelLogEnum.ERROR,
            'UserManagementService',
            'Error al obtener usuarios',
            {
              error: error,
              component: 'UserManagementService',
              method: 'getUsers',
              timestamp: new Date().toISOString()
            }
          );
          this.loadingSubject.next(false);
          observer.error(error);
        }
      });
    });
  }

  getUserById(id: string): Observable<User> {
    return this.userService.getUserById(id);
  }

  updateUser(updateRequest: UserUpdateRequest): Observable<User> {
    const updateData: any = {};
    
    if (updateRequest.username) updateData.username = updateRequest.username;
    if (updateRequest.name) updateData.name = updateRequest.name;
    if (updateRequest.lastName) updateData.lastName = updateRequest.lastName;
    if (updateRequest.role) updateData.role = updateRequest.role;
    if (updateRequest.isVerified !== undefined) updateData.isVerified = updateRequest.isVerified;
    if (updateRequest.isActive !== undefined) updateData.isActive = updateRequest.isActive;
    if (updateRequest.avatar) updateData.avatar = updateRequest.avatar;
    if (updateRequest.isDarkMode !== undefined) updateData.isDarkMode = updateRequest.isDarkMode;
    if (updateRequest.password) updateData.password = updateRequest.password;
    
    return this.userService.userEdit(updateRequest.id, updateData);
  }

  deleteUser(id: string): Observable<void> {
    // Note: The real API might not support user deletion
    // This is a placeholder implementation
    return new Observable(observer => {
      observer.next();
      observer.complete();
    });
  }

  activateUser(id: string): Observable<User> {
    return this.userService.userEdit(id, { isActive: true });
  }

  deactivateUser(id: string): Observable<User> {
    return this.userService.userEdit(id, { isActive: false });
  }

  sendVerificationEmail(request: SendVerificationEmailRequest): Observable<any> {
    // Try to generate a new verification token for the user
    const generateTokenUrl = `${environment.API_URL}/user/generate-verification-token/${request.userId}`;
    
    return new Observable(observer => {
      this.http.post(generateTokenUrl, {}).subscribe({
        next: (response: any) => {
          // After generating the token, send the verification email
          const mailDataValidate: MailSendValidateData = {} as MailSendValidateData;
          
          // Configure email data following the same pattern as registration
          mailDataValidate.url = `${environment.BASE_URL}/auth/validate/${response.token}`;
          mailDataValidate.subject = translations['email.validateEmailSubject'];
          mailDataValidate.title = `${translations['email.validateEmailTitle']} ${environment.META_TITLE}`;
          mailDataValidate.greet = translations['email.validateEmailGreet'];
          mailDataValidate.subMessage = translations['email.validateEmailSubMessage'];
          mailDataValidate.template = TemplateEmail.WELCOME;
          mailDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;
          mailDataValidate.buttonMessage = translations['email.validateEmailButtonMessage'];
          mailDataValidate.message = translations['email.validateEmailMessage'];
          mailDataValidate.email = request.email;
          mailDataValidate.token = response.token; // Use the newly generated token

          // Use the email notification service to send the verification email
          this.emailNotificationService.sendNotification(mailDataValidate).subscribe({
            next: (emailResponse) => {
              observer.next(emailResponse);
              observer.complete();
            },
            error: (emailError) => {
              observer.error(emailError);
            }
          });
        },
        error: (tokenError) => {
          this.logService.log(
            LevelLogEnum.WARN,
            'UserManagementService',
            'Endpoint de generación de token no disponible, usando método alternativo',
            {
              error: tokenError,
              component: 'UserManagementService',
              method: 'sendVerificationEmail',
              fallback: 'tokenGeneration',
              timestamp: new Date().toISOString()
            }
          );
          
          // Fallback: Use the existing user's token if available, or send without token
          // The backend should handle token generation during the validation process
          const mailDataValidate: MailSendValidateData = {} as MailSendValidateData;
          
          mailDataValidate.url = `${environment.BASE_URL}/auth/validate/`;
          mailDataValidate.subject = translations['email.validateEmailSubject'];
          mailDataValidate.title = `${translations['email.validateEmailTitle']} ${environment.META_TITLE}`;
          mailDataValidate.greet = translations['email.validateEmailGreet'];
          mailDataValidate.subMessage = translations['email.validateEmailSubMessage'];
          mailDataValidate.template = TemplateEmail.WELCOME;
          mailDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;
          mailDataValidate.buttonMessage = translations['email.validateEmailButtonMessage'];
          mailDataValidate.message = translations['email.validateEmailMessage'];
          mailDataValidate.email = request.email;

          // Use the email notification service to send the verification email
          this.emailNotificationService.sendNotification(mailDataValidate).subscribe({
            next: (emailResponse) => {
              observer.next(emailResponse);
              observer.complete();
            },
            error: (emailError) => {
              observer.error(emailError);
            }
          });
        }
      });
    });
  }

  changeUserRole(id: string, role: UserRole): Observable<User> {
    return this.userService.userEdit(id, { role });
  }

  getUsersCount(): Observable<{ total: number; byStatus: Record<UserStatus, number>; byRole: Record<UserRole, number> }> {
    return new Observable(observer => {
      this.userService.getAllUsers().subscribe({
        next: (users) => {
          const total = users.length;
          const byStatus = {
            [UserStatus.ACTIVE]: users.filter(u => u.isActive && u.isVerified).length,
            [UserStatus.INACTIVE]: users.filter(u => !u.isActive).length,
            [UserStatus.PENDING_VERIFICATION]: users.filter(u => !u.isVerified).length
          };
          const byRole = {
            [UserRole.ADMIN]: users.filter(u => u.role === 'admin').length,
            [UserRole.MODERATOR]: users.filter(u => u.role === 'moderator').length,
            [UserRole.USER]: users.filter(u => u.role === 'user').length,
            [UserRole.GUEST]: users.filter(u => u.role === 'guest').length
          };
          
          observer.next({ total, byStatus, byRole });
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }


} 