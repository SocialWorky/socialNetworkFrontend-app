import { Component, Input, Output, EventEmitter } from '@angular/core';
import { User } from '@shared/interfaces/user.interface';
import { UserUpdateRequest } from '@admin/interfaces/user-management.interface';

@Component({
  selector: 'worky-user-edit-modal',
  templateUrl: './user-edit-modal.component.html',
  styleUrls: ['./user-edit-modal.component.scss'],
  standalone: false
})
export class UserEditModalComponent {
  @Input() showModal = false;
  @Input() user: User | null = null;
  @Input() isUpdating = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() updateUser = new EventEmitter<UserUpdateRequest>();

  newPassword: string = '';

  onCloseModal(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (!this.user) return;

    const updateRequest: UserUpdateRequest = {
      id: this.user._id,
      username: this.user.username,
      name: this.user.name,
      lastName: this.user.lastName,
      role: this.user.role,
      isVerified: this.user.isVerified,
      isActive: this.user.isActive,
      avatar: this.user.avatar,
      isDarkMode: this.user.isDarkMode,
      ...(this.newPassword && { password: this.newPassword })
    };

    this.updateUser.emit(updateRequest);
  }
} 