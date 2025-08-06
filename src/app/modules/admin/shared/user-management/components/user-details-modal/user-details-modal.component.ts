import { Component, Input, Output, EventEmitter } from '@angular/core';
import { User } from '@shared/interfaces/user.interface';

@Component({
  selector: 'worky-user-details-modal',
  templateUrl: './user-details-modal.component.html',
  styleUrls: ['./user-details-modal.component.scss'],
  standalone: false
})
export class UserDetailsModalComponent {
  @Input() showModal = false;
  @Input() user: User | null = null;
  @Output() closeModal = new EventEmitter<void>();

  onCloseModal(): void {
    this.closeModal.emit();
  }
} 