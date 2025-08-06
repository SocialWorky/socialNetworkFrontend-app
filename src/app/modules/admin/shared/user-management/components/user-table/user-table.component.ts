import { Component, Input, Output, EventEmitter } from '@angular/core';
import { User } from '@shared/interfaces/user.interface';

@Component({
  selector: 'worky-user-table',
  templateUrl: './user-table.component.html',
  styleUrls: ['./user-table.component.scss'],
  standalone: false
})
export class UserTableComponent {
  @Input() users: User[] = [];
  @Input() loading = false;
  @Input() totalUsers = 0;
  @Input() loadingStates: any = {};
  
  @Output() viewUserDetails = new EventEmitter<User>();
  @Output() editUser = new EventEmitter<User>();
  @Output() toggleUserStatus = new EventEmitter<User>();
  @Output() sendVerificationEmail = new EventEmitter<User>();

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

  trackByUserId(index: number, user: User): string {
    return user._id;
  }

  isTogglingStatus(userId: string): boolean {
    return this.loadingStates.toggleStatus?.has(userId) || false;
  }

  isSendingVerification(userId: string): boolean {
    return this.loadingStates.sendVerification?.has(userId) || false;
  }
} 