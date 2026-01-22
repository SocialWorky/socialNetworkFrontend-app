import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { UserService } from '@shared/services/core-apis/users.service';
import { User } from '@shared/interfaces/user.interface';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '@shared/services/alert.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';

@Component({
    selector: 'worky-last-registered-users',
    templateUrl: './last-registered-users.component.html',
    styleUrls: ['./last-registered-users.component.scss'],
    standalone: false
})
export class LastRegisteredUsersComponent implements OnInit, OnDestroy {

  private unsubscribe$ = new Subject<void>();

  constructor(
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
    private _alertService: AlertService,
    private _logService: LogService
  ) { }

  users: User[] = [];
  isLoading = false;
  error: string | null = null;
  updatingUsers = new Set<string>();

  // Computed properties for statistics
  get activeUsersCount(): number {
    return this.users.filter(user => user.isActive).length;
  }

  get pendingUsersCount(): number {
    return this.users.filter(user => !user.isVerified).length;
  }

  get inactiveUsersCount(): number {
    return this.users.filter(user => !user.isActive).length;
  }

  ngOnInit() {
    this.getUsers();
  }

  private async getUsers() {
    this.isLoading = true;
    this.error = null;
    
    try {
      await this._userService.searchUsers(6).pipe(takeUntil(this.unsubscribe$)).subscribe({
        next: (data: User[]) => {
          const filterDate = new Date('2023-01-01');

          const filteredUsers = data.filter(user => {
            const registrationDate = new Date(user.createdAt);
            return registrationDate > filterDate;
          });

          const sortedUsers = filteredUsers.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });

          this.users = sortedUsers;
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'LastRegisteredUsersComponent',
            'Error fetching users',
            { error: String(error) }
          );
          this.error = this.translate('admin.lastRegisteredUsers.alerts.errorLoadingUsers');
          this._cdr.markForCheck();
        }
      });
    } finally {
      this.isLoading = false;
      this._cdr.markForCheck();
    }
  }

  refreshUsers() {
    this.getUsers();
  }

  async toggleUserStatus(user: User) {
    if (this.updatingUsers.has(user._id)) return;

    this.updatingUsers.add(user._id);
    this._cdr.markForCheck();

    try {
      const newStatus = !user.isActive;
      const updateData = { isActive: newStatus };

      await this._userService.userEdit(user._id, updateData).pipe(takeUntil(this.unsubscribe$)).subscribe({
        next: (updatedUser: User) => {
          const userIndex = this.users.findIndex(u => u._id === user._id);
          if (userIndex !== -1) {
            this.users[userIndex] = { ...this.users[userIndex], ...updatedUser };
          }

          const messageKey = newStatus ? 'admin.lastRegisteredUsers.alerts.userActivated' : 'admin.lastRegisteredUsers.alerts.userDeactivated';
          this._alertService.showAlert(
            this.translate('admin.lastRegisteredUsers.alerts.success'),
            this.translate(messageKey),
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            this.translate('common.ok')
          );
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'LastRegisteredUsersComponent',
            'Error updating user status',
            { error: String(error), userId: user._id, newStatus }
          );
          this._alertService.showAlert(
            this.translate('admin.lastRegisteredUsers.alerts.error'),
            this.translate('admin.lastRegisteredUsers.alerts.errorUpdatingStatus'),
            Alerts.ERROR,
            Position.CENTER,
            true,
            this.translate('common.ok')
          );
          this._cdr.markForCheck();
        }
      });
    } finally {
      this.updatingUsers.delete(user._id);
      this._cdr.markForCheck();
    }
  }

  trackByUserId(index: number, user: User): string {
    return user._id;
  }

  getStatusClass(user: User): string {
    if (!user.isActive) return 'status-inactive';
    if (!user.isVerified) return 'status-pending';
    return 'status-active';
  }

  getVerificationClass(user: User): string {
    return user.isVerified ? 'verified' : 'pending';
  }

  getRoleClass(role: string): string {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'role-admin';
      case 'moderator':
        return 'role-moderator';
      default:
        return 'role-user';
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  /**
   * Método auxiliar para traducciones
   */
  private translate(key: string): string {
    // Por ahora retornamos las claves directamente
    // In a real environment, this should use a translation service
    const translations: { [key: string]: string } = {
      'admin.lastRegisteredUsers.alerts.success': 'Éxito',
      'admin.lastRegisteredUsers.alerts.userActivated': 'Usuario activado exitosamente',
      'admin.lastRegisteredUsers.alerts.userDeactivated': 'Usuario desactivado exitosamente',
      'admin.lastRegisteredUsers.alerts.error': 'Error',
      'admin.lastRegisteredUsers.alerts.errorUpdatingStatus': 'Error al actualizar el estado del usuario. Por favor, inténtalo de nuevo.',
      'admin.lastRegisteredUsers.alerts.errorLoadingUsers': 'Error al cargar usuarios. Por favor, inténtalo de nuevo.',
      'common.ok': 'Aceptar'
    };
    
    return translations[key] || key;
  }
}
