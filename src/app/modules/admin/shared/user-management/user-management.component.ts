import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
  filteredUsers: User[] = [];
  loading = false;
  totalUsers = 0;
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  
  // Filters
  filtersForm: FormGroup;
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

  // Form data
  newPassword: string = '';
  
  // Enums for template
  UserRole = UserRole;
  UserStatus = UserStatus;
  
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserManagementService,
    private alertService: AlertService,
    private fb: FormBuilder,
    private _cdr: ChangeDetectorRef,
    private _logService: LogService,
    private _utilityService: UtilityService
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      role: [''],
      status: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadUserStats();
    
    // Subscribe to service observables
    this.userService.users$.pipe(takeUntil(this.destroy$)).subscribe(users => {
      this.users = users;
      this.filteredUsers = users;
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
    const filters: UserFilters = this.filtersForm.value;
    
    // Use real service
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
    // Get real statistics from service
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

  applyFilters(): void {
    this.currentPage = 1;
    this.loadUsers();
    this.showFilters = false;
  }

  clearFilters(): void {
    this.filtersForm.reset();
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
    this.newPassword = '';
    this.showEditModal = true;
    this._cdr.markForCheck();
  }

  viewUserDetails(user: User): void {
    this.selectedUser = user;
    this.showUserDetails = true;
    this._cdr.markForCheck();
  }

  updateUser(): void {
    if (!this.selectedUser) return;

    this.loadingStates.updateUser = true;

    const updateRequest: UserUpdateRequest = {
      id: this.selectedUser._id,
      username: this.selectedUser.username,
      name: this.selectedUser.name,
      lastName: this.selectedUser.lastName,
      role: this.selectedUser.role,
      isVerified: this.selectedUser.isVerified,
      isActive: this.selectedUser.isActive,
      avatar: this.selectedUser.avatar,
      isDarkMode: this.selectedUser.isDarkMode,
      ...(this.newPassword && { password: this.newPassword })
    };

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
            { error: String(error), userId: this.selectedUser?._id }
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

    // Add user to loading set
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
    this.newPassword = '';
    this._cdr.markForCheck();
  }

  closeUserDetails(): void {
    this.showUserDetails = false;
    this.selectedUser = null;
    this._cdr.markForCheck();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'warning';
      case 'SUSPENDED':
        return 'danger';
      case 'PENDING':
        return 'info';
      default:
        return 'secondary';
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'editor':
        return 'warning';
      case 'user':
        return 'success';
      default:
        return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'check_circle';
      case 'INACTIVE':
        return 'pause_circle';
      case 'SUSPENDED':
        return 'block';
      case 'PENDING':
        return 'schedule';
      default:
        return 'help';
    }
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'admin':
        return 'admin_panel_settings';
      case 'editor':
        return 'edit';
      case 'user':
        return 'person';
      default:
        return 'person';
    }
  }

  refreshUsers(): void {
    this.loadUsers();
    this.loadUserStats();
  }

  trackByUserId(index: number, user: User): string {
    return user._id;
  }

  // Helper methods for loading states
  isUpdatingUser(): boolean {
    return this.loadingStates.updateUser;
  }

  isTogglingStatus(userId: string): boolean {
    return this.loadingStates.toggleStatus.has(userId);
  }

  isSendingVerification(userId: string): boolean {
    return this.loadingStates.sendVerification.has(userId);
  }

  onImageError(event: Event): void {
    this._utilityService.handleImageError(event, 'assets/img/shared/drag-drop-upload-add-file.webp');
  }

  sendVerificationEmail(user: User): void {
    // Add user to loading set
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
