import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { UserService } from '@shared/services/core-apis/users.service';
import { User } from '@shared/interfaces/user.interface';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '@shared/services/alert.service';
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
    private _alertService: AlertService
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
          console.error('Error fetching users:', error);
          this.error = 'Error loading users. Please try again.';
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

          const action = newStatus ? 'activated' : 'deactivated';
          this._alertService.showAlert(
            'Success',
            `User ${action} successfully`,
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            'OK'
          );
          this._cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error updating user status:', error);
          this._alertService.showAlert(
            'Error',
            'Error updating user status. Please try again.',
            Alerts.ERROR,
            Position.CENTER,
            true,
            'OK'
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
}
