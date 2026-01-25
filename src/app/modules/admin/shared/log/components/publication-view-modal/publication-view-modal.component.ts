import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { LogService as AdminLogService } from '../../../log/services/log.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { CommonModule } from '@angular/common';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { translations } from '@translations/translations';

export interface PublicationViewModalData {
  publicationId: string;
  imageUrl?: string;
  mediaId?: string;
  logId?: string; // ID of the log entry for marking as resolved
}

@Component({
  selector: 'worky-publication-view-modal',
  standalone: true,
  imports: [CommonModule, TranslationsModule],
  template: `
    <div class="publication-modal-container">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <i class="material-icons text-white text-lg">article</i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">{{ 'admin.log.publicationModal.title' | workyTranslations }}</h3>
            <p class="text-slate-400 text-sm">{{ 'admin.log.publicationModal.subtitle' | workyTranslations }}</p>
          </div>
        </div>
        <button 
          class="text-slate-400 hover:text-slate-200 hover:bg-slate-700 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200" 
          (click)="onClose()">
          <i class="material-icons">close</i>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[70vh]">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex flex-col items-center justify-center py-12">
          <div class="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
          <p class="text-slate-400 mt-4">{{ 'admin.log.publicationModal.loading' | workyTranslations }}</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error && !isLoading" class="flex flex-col items-center justify-center py-12">
          <i class="material-icons text-6xl text-red-500 mb-4">error</i>
          <p class="text-red-400 text-lg font-semibold">{{ 'admin.log.publicationModal.error.title' | workyTranslations }}</p>
          <p class="text-slate-400 text-sm mt-2">{{ error }}</p>
        </div>

        <!-- Publication Content -->
        <div *ngIf="publication && !isLoading && !error" class="space-y-6">
          <!-- Publication Info -->
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div class="flex items-start justify-between mb-4">
              <div>
                <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">{{ 'admin.log.publicationModal.publicationId' | workyTranslations }}</p>
                <p class="text-sm font-mono text-slate-300 break-all">{{ publication._id }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">{{ 'admin.log.publicationModal.created' | workyTranslations }}</p>
                <p class="text-sm text-slate-300">{{ publication.createdAt | date: 'short' }}</p>
              </div>
            </div>
            
            <div *ngIf="publication.content" class="mt-4">
              <p class="text-xs text-slate-400 uppercase tracking-wider mb-2">{{ 'admin.log.publicationModal.content' | workyTranslations }}</p>
              <p class="text-slate-300 text-sm whitespace-pre-wrap">{{ publication.content }}</p>
            </div>

            <div class="mt-4 flex items-center gap-4">
              <span class="text-xs text-slate-400">{{ 'admin.log.publicationModal.author' | workyTranslations }}</span>
              <span class="text-sm text-slate-300" *ngIf="publication.author">
                {{ publication.author.name }} {{ publication.author.lastName }}
              </span>
            </div>
          </div>

          <!-- Media Section -->
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-semibold text-white flex items-center gap-2">
                <i class="material-icons text-blue-500">image</i>
                {{ 'admin.log.publicationModal.mediaFiles' | workyTranslations }} ({{ publication.media ? publication.media.length : 0 }})
              </h4>
            </div>

            <!-- Media List -->
            <div *ngIf="publication.media && publication.media.length > 0" class="space-y-3">
              <div 
                *ngFor="let media of publication.media; let i = index; trackBy: trackByMediaId" 
                class="bg-slate-900 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-all"
                [class.border-red-500]="isProblematicMedia(media)">
                <div class="flex items-start gap-4">
                  <!-- Media Preview -->
                  <div class="w-24 h-24 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      *ngIf="media.urlCompressed || media.url"
                      [src]="getMediaUrl(media)"
                      [alt]="'Media ' + (i + 1)"
                      class="w-full h-full object-cover"
                      (error)="onImageError($event, media)"
                      onerror="this.src='assets/img/shared/handleImageError.png'"
                    />
                    <div *ngIf="!media.urlCompressed && !media.url" class="w-full h-full flex items-center justify-center">
                      <i class="material-icons text-slate-500">image</i>
                    </div>
                  </div>

                  <!-- Media Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-white mb-1">
                          {{ 'admin.log.publicationModal.media.title' | workyTranslations }} {{ i + 1 }}
                          <span *ngIf="isProblematicMedia(media)" class="ml-2 px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">
                            {{ 'admin.log.publicationModal.media.missing' | workyTranslations }}
                          </span>
                        </p>
                        <p class="text-xs text-slate-400 font-mono truncate" [title]="getMediaUrl(media)">
                          {{ getMediaUrl(media) }}
                        </p>
                        <p *ngIf="media._id" class="text-xs text-slate-500 mt-1">
                          ID: {{ media._id }}
                        </p>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="mt-3 flex gap-2">
                      <button
                        class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        (click)="removeMedia(media, i)"
                        [disabled]="isMediaBeingRemoved(media._id)">
                        <i class="material-icons text-base">{{ isMediaBeingRemoved(media._id) ? 'hourglass_empty' : 'delete' }}</i>
                        {{ isMediaBeingRemoved(media._id) ? ('admin.log.publicationModal.media.removing' | workyTranslations) : ('admin.log.publicationModal.media.remove' | workyTranslations) }}
                      </button>
                      <a
                        [href]="getMediaUrl(media)"
                        target="_blank"
                        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                        rel="noopener noreferrer">
                        <i class="material-icons text-base">open_in_new</i>
                        {{ 'admin.log.publicationModal.media.openUrl' | workyTranslations }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="!publication.media || publication.media.length === 0" class="text-center py-8 text-slate-400">
              <i class="material-icons text-4xl mb-2">image_not_supported</i>
              <p>{{ 'admin.log.publicationModal.media.noFiles' | workyTranslations }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-800">
        <button
          class="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-all duration-200"
          (click)="onClose()">
          {{ 'admin.log.publicationModal.close' | workyTranslations }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .publication-modal-container {
      background: linear-gradient(to bottom, #1e293b, #0f172a);
      border-radius: 1rem;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  `]
})
export class PublicationViewModalComponent implements OnInit, OnDestroy {
  publication: PublicationView | null = null;
  isLoading = true;
  error: string | null = null;
  isRemoving = false;
  problematicImageUrl: string | null = null;

  /** Track media IDs that have been successfully removed in this session */
  private removedMediaIds = new Set<string>();
  /** Track media IDs currently being removed to prevent duplicate requests */
  private removingMediaIds = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PublicationViewModalData,
    private dialogRef: MatDialogRef<PublicationViewModalComponent>,
    private publicationService: PublicationService,
    private logService: LogService,
    private adminLogService: AdminLogService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {
    this.problematicImageUrl = data.imageUrl || null;
  }

  ngOnInit(): void {
    this.loadPublication();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPublication(): void {
    this.isLoading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.publicationService.getPublicationId(this.data.publicationId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (publications) => {
          if (publications && publications.length > 0) {
            this.publication = publications[0];
          } else {
            this.error = translations['admin.log.publicationModal.error.notFound'] || 'Publication not found';
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.message || translations['admin.log.publicationModal.error.loadFailed'] || 'Failed to load publication';
          this.isLoading = false;
          this.logService.log(
            LevelLogEnum.ERROR,
            'PublicationViewModalComponent',
            'Error loading publication',
            { publicationId: this.data.publicationId, error: err }
          );
          this.cdr.markForCheck();
        }
      });
  }

  isProblematicMedia(media: any): boolean {
    if (!this.problematicImageUrl) return false;
    const mediaUrl = media.urlCompressed || media.url || '';
    return mediaUrl.includes(this.problematicImageUrl) || 
           this.problematicImageUrl.includes(mediaUrl) ||
           (this.data.mediaId && media._id === this.data.mediaId);
  }

  getMediaUrl(media: any): string {
    return media.urlCompressed || media.url || '';
  }

  trackByMediaId(index: number, media: any): string {
    return media._id || index.toString();
  }

  /**
   * Check if a specific media is currently being removed
   */
  isMediaBeingRemoved(mediaId: string): boolean {
    return this.removingMediaIds.has(mediaId);
  }

  /**
   * Check if a specific media was already removed in this session
   */
  isMediaAlreadyRemoved(mediaId: string): boolean {
    return this.removedMediaIds.has(mediaId);
  }

  onImageError(event: Event, media: any): void {
    // Image failed to load - mark as problematic
    const img = event.target as HTMLImageElement;
    img.src = 'assets/img/shared/handleImageError.png';
  }

  removeMedia(media: any, index: number): void {
    if (!this.publication || !this.publication.media || !media._id) return;

    const mediaId = media._id;

    // Check if this media was already removed in this session
    if (this.removedMediaIds.has(mediaId)) {
      this.alertService.showAlert(
        translations['alert.info'] || 'Info',
        translations['admin.log.publicationModal.media.alreadyRemoved'] || 'This media has already been removed',
        Alerts.INFO,
        Position.CENTER,
        true,
        translations['button.ok'] || 'OK'
      );
      return;
    }

    // Check if this media is currently being removed
    if (this.removingMediaIds.has(mediaId)) {
      return; // Silently ignore duplicate clicks
    }

    // Get media URL for confirmation message
    const mediaUrl = this.getMediaUrl(media);
    const confirmMessage = translations['admin.log.publicationModal.media.removeConfirm.message']
      .replace('{0}', mediaUrl);

    // Use AlertService for confirmation
    this.alertService.showConfirmation(
      translations['admin.log.publicationModal.media.removeConfirm.title'],
      confirmMessage,
      translations['button.delete'] || 'Delete',
      translations['button.cancel'] || 'Cancel',
      Alerts.WARNING,
      Position.CENTER
    ).pipe(takeUntil(this.destroy$)).subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      // Double-check after confirmation dialog (user might have clicked twice)
      if (this.removedMediaIds.has(mediaId) || this.removingMediaIds.has(mediaId)) {
        return;
      }

      // Mark as currently removing
      this.removingMediaIds.add(mediaId);
      this.isRemoving = true;
      this.cdr.markForCheck();

      // Call backend endpoint to remove media
      this.publicationService.removeMediaFromPublication(this.publication!._id, mediaId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Mark as successfully removed
            this.removedMediaIds.add(mediaId);
            this.removingMediaIds.delete(mediaId);

            // Update local publication data immediately (remove the media from the list)
            if (this.publication && this.publication.media) {
              this.publication = {
                ...this.publication,
                media: this.publication.media.filter(m => m._id !== mediaId)
              };
            }

            // Mark log as resolved if logId is provided
            if (this.data.logId) {
              this.markLogAsResolved(this.data.logId);
            }

            const successMessage = translations['admin.log.publicationModal.media.removeSuccess']
              .replace('{0}', response.remainingMedia.toString());

            this.alertService.showAlert(
              translations['alert.success'] || 'Success',
              successMessage,
              Alerts.SUCCESS,
              Position.CENTER,
              true,
              translations['button.ok'] || 'OK'
            );

            this.logService.log(
              LevelLogEnum.INFO,
              'PublicationViewModalComponent',
              'Media removed from publication successfully',
              {
                publicationId: this.publication!._id,
                mediaId: mediaId,
                mediaUrl: mediaUrl,
                remainingMedia: response.remainingMedia,
                removedMediaIndex: index,
                logId: this.data.logId
              }
            );

            this.isRemoving = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            // Remove from currently removing set
            this.removingMediaIds.delete(mediaId);

            // Check if error is "Media not found" - this means it was already deleted
            const errorMsg = error?.error?.message || error?.message || '';
            if (errorMsg.includes('Media not found') || errorMsg.includes('not found')) {
              // Media was already deleted, mark as removed and update UI
              this.removedMediaIds.add(mediaId);

              if (this.publication && this.publication.media) {
                this.publication = {
                  ...this.publication,
                  media: this.publication.media.filter(m => m._id !== mediaId)
                };
              }

              this.alertService.showAlert(
                translations['alert.info'] || 'Info',
                translations['admin.log.publicationModal.media.alreadyRemoved'] || 'This media was already removed',
                Alerts.INFO,
                Position.CENTER,
                true,
                translations['button.ok'] || 'OK'
              );
            } else {
              const errorMessage = translations['admin.log.publicationModal.media.removeError']
                .replace('{0}', error?.message || translations['error.unknown'] || 'Unknown error');

              this.alertService.showAlert(
                translations['alert.error'] || 'Error',
                errorMessage,
                Alerts.ERROR,
                Position.CENTER,
                true,
                translations['button.ok'] || 'OK'
              );

              this.logService.log(
                LevelLogEnum.ERROR,
                'PublicationViewModalComponent',
                'Error removing media from publication',
                {
                  publicationId: this.publication!._id,
                  mediaId: mediaId,
                  mediaUrl: mediaUrl,
                  error: error?.message || String(error),
                  errorStatus: error?.status
                }
              );
            }

            this.isRemoving = false;
            this.cdr.markForCheck();
          }
        });
    });
  }

  /**
   * Mark log as resolved
   */
  private markLogAsResolved(logId: string): void {
    this.adminLogService.markAsResolved(logId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.logService.log(
            LevelLogEnum.INFO,
            'PublicationViewModalComponent',
            'Log marked as resolved',
            { logId, publicationId: this.publication?._id }
          );
        },
        error: (error: { message?: string }) => {
          this.logService.log(
            LevelLogEnum.ERROR,
            'PublicationViewModalComponent',
            'Error marking log as resolved',
            { logId, error: error?.message || String(error) }
          );
        }
      });
  }

  onClose(): void {
    this.dialogRef.close({ refreshed: true });
  }
}
