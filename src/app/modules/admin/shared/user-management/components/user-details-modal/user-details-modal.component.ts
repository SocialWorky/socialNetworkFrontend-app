import { Component, Input, Output, EventEmitter } from '@angular/core';
import { User } from '@shared/interfaces/user.interface';
import { UtilityService } from '@shared/services/utility.service';
import { environment } from '@env/environment';

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

  constructor(private utilityService: UtilityService) {}

  getNormalizedCoverImage(coverImage: string | undefined): string {
    if (!coverImage) {
      return 'assets/img/shared/drag-drop-upload-add-file.webp';
    }
    return this.utilityService.normalizeImageUrl(coverImage, environment.MINIO_BUCKET_URL || '');
  }

  onCloseModal(): void {
    this.closeModal.emit();
  }
} 