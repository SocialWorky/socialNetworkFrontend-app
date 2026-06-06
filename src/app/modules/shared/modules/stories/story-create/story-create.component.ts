import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { StoriesService } from '@shared/services/core-apis/stories.service';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';

@Component({
  selector: 'worky-story-create',
  templateUrl: './story-create.component.html',
  styleUrls: ['./story-create.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class StoryCreateComponent implements OnDestroy {
  @Output() closed = new EventEmitter<void>();
  @Output() published = new EventEmitter<void>();

  selectedFile: File | null = null;
  preview: string | null = null;
  mediaType: 'image' | 'video' = 'image';
  textOverlay = '';
  isUploading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly storiesService: StoriesService,
    private readonly fileUploadService: FileUploadService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFile = file;
    this.mediaType = file.type.startsWith('video') ? 'video' : 'image';
    const reader = new FileReader();
    reader.onload = (e) => {
      this.preview = e.target?.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
    this.cdr.markForCheck();
  }

  publish(): void {
    if (!this.selectedFile) return;
    this.isUploading = true;
    this.cdr.markForCheck();

    this.fileUploadService
      .uploadFile([this.selectedFile], 'stories', null, null, TypePublishing.PROFILE_IMG)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const file = response?.files?.[0];
          if (!file) { this.isUploading = false; this.cdr.markForCheck(); return; }

          this.storiesService.createStory({
            mediaUrl: file.urlCompressed ?? file.url,
            mediaThumbnailUrl: file.urlThumbnail ?? undefined,
            mediaType: this.mediaType,
            textOverlay: this.textOverlay.trim() || undefined,
          }).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
              this.isUploading = false;
              this.published.emit();
              this.closed.emit();
              this.cdr.markForCheck();
            },
            error: () => { this.isUploading = false; this.cdr.markForCheck(); },
          });
        },
        error: () => { this.isUploading = false; this.cdr.markForCheck(); },
      });
  }
}
