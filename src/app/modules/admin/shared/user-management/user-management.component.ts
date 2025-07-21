import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { UserManagementService } from '@admin/services/user-management.service';
import { AlertService } from '@shared/services/alert.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { UtilityService } from '@shared/services/utility.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { User } from '@shared/interfaces/user.interface';
import { 
  UserFilters, 
  UserUpdateRequest,
  UserRole,
  UserStatus,
  SendVerificationEmailRequest
} from '@admin/interfaces/user-management.interface';

@Component({
  selector: 'worky-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  standalone: false
})
export class UserManagementComponent implements OnInit, OnDestroy {
  users: User[] = [];
  loading = false;
  totalUsers = 0;
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  
  // Filters
  showFilters = false;
  
  // Actions
  selectedUser: User | null = null;
  showEditModal = false;
  showUserDetails = false;
  
  // Statistics
  userStats = {
    total: 0,
    active: 0,
    inactive: 0,
    pendingVerification: 0
  };

  // Loading states for buttons
  loadingStates = {
    updateUser: false,
    deleteUser: false,
    toggleStatus: new Set<string>(),
    sendVerification: new Set<string>()
  };
  
  // Enums for template
  UserRole = UserRole;
  UserStatus = UserStatus;
  
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserManagementService,
    private alertService: AlertService,
    private _cdr: ChangeDetectorRef,
    private _logService: LogService,
    private _utilityService: UtilityService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadUserStats();
    
    // Subscribe to service observables
    this.userService.users$.pipe(takeUntil(this.destroy$)).subscribe(users => {
      this.users = users;
      this._cdr.markForCheck();
    });
    
    this.userService.loading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.loading = loading;
      this._cdr.markForCheck();
    });
    
    this.userService.totalUsers$.pipe(takeUntil(this.destroy$)).subscribe(total => {
      this.totalUsers = total;
      this._cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    const filters: UserFilters = {};
    
    this.userService.getUsers(filters, this.currentPage, this.itemsPerPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.totalPages = response.totalPages;
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'UserManagementComponent',
            'Error loading users',
            { error: String(error) }
          );
          this.alertService.showAlert(
            'Error',
            'Error al cargar los usuarios',
            Alerts.ERROR,
            Position.CENTER,
            true,
            'Aceptar'
          );
        }
      });
  }

  loadUserStats(): void {
    this.userService.getUsersCount().subscribe({
      next: (stats) => {
        this.userStats = {
          total: stats.total,
          active: stats.byStatus[UserStatus.ACTIVE] || 0,
          inactive: stats.byStatus[UserStatus.INACTIVE] || 0,
          pendingVerification: stats.byStatus[UserStatus.PENDING_VERIFICATION] || 0
        };
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'UserManagementComponent',
          'Error loading user statistics',
          { error: String(error) }
        );
      }
    });
  }

  onFiltersApplied(filters: UserFilters): void {
    this.currentPage = 1;
    this.loadUsers();
    this.showFilters = false;
  }

  onFiltersCleared(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  editUser(user: User): void {
    this.selectedUser = { 
      ...user,
      isDarkMode: user.isDarkMode ?? false
    };
    this.showEditModal = true;
    this._cdr.markForCheck();
  }

  viewUserDetails(user: User): void {
    this.selectedUser = user;
    this.showUserDetails = true;
    this._cdr.markForCheck();
  }

  updateUser(updateRequest: UserUpdateRequest): void {
    this.loadingStates.updateUser = true;

    this.userService.updateUser(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingStates.updateUser = false;
          this._cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.alertService.showAlert(
            'Éxito',
            'Usuario actualizado correctamente',
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            'Aceptar'
          );
          this.closeEditModal();
          this.loadUsers();
          this.loadUserStats();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'UserManagementComponent',
            'Error updating user',
            { error: String(error), userId: updateRequest.id }
          );
          this.alertService.showAlert(
            'Error',
            'Error al actualizar el usuario',
            Alerts.ERROR,
            Position.CENTER,
            true,
            'Aceptar'
          );
        }
      });
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.isActive;
    const action = newStatus ? 'activado' : 'desactivado';

    this.loadingStates.toggleStatus.add(user._id);

    const updateRequest: UserUpdateRequest = {
      id: user._id,
      isActive: newStatus
    };

    this.userService.updateUser(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingStates.toggleStatus.delete(user._id);
          this._cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.alertService.showAlert(
            'Éxito',
            `Usuario ${action} correctamente`,
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            'Aceptar'
          );
          this.loadUsers();
          this.loadUserStats();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'UserManagementComponent',
            'Error toggling user status',
            { error: String(error), userId: user._id, newStatus }
          );
          this.alertService.showAlert(
            'Error',
            'Error al cambiar el estado del usuario',
            Alerts.ERROR,
            Position.CENTER,
            true,
            'Aceptar'
          );
        }
      });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
    this._cdr.markForCheck();
  }

  closeUserDetails(): void {
    this.showUserDetails = false;
    this.selectedUser = null;
    this._cdr.markForCheck();
  }

  refreshUsers(): void {
    this.loadUsers();
    this.loadUserStats();
  }

  isUpdatingUser(): boolean {
    return this.loadingStates.updateUser;
  }

  sendVerificationEmail(user: User): void {
    this.loadingStates.sendVerification.add(user._id);

    const request: SendVerificationEmailRequest = {
      userId: user._id,
      email: user.email
    };

    this.userService.sendVerificationEmail(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingStates.sendVerification.delete(user._id);
          this._cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.alertService.showAlert(
            'Éxito',
            'Email de verificación enviado correctamente a ' + user.email,
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            'Aceptar'
          );
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'UserManagementComponent',
            'Error sending verification email',
            { 
              error: String(error), 
              userId: user._id, 
              userEmail: user.email,
              errorMessage: error.error?.message 
            }
          );
          let errorMessage = 'Error al enviar el email de verificación';
          
          if (error.error?.message === 'Failed send email') {
            errorMessage = 'Error técnico al enviar el email. Por favor, inténtalo de nuevo.';
          } else if (error.error?.message === 'Email not found') {
            errorMessage = 'El email del usuario no se encontró en el sistema.';
          }
          
          this.alertService.showAlert(
            'Error',
            errorMessage,
            Alerts.ERROR,
            Position.CENTER,
            true,
            'Aceptar'
          );
        }
      });
  }
}
