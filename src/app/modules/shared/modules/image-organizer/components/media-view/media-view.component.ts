import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { distinctUntilChanged, filter, Subject, takeUntil } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialog  } from '@angular/material/dialog';
import * as _ from 'lodash';

import { ImageOrganizer } from '../../interfaces/image-organizer.interface';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { Comment, PublicationView } from '@shared/interfaces/publicationView.interface';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';

@Component({
    selector: 'worky-media-view',
    templateUrl: './media-view.component.html',
    styleUrls: ['./media-view.component.scss'],
    standalone: false
})
export class MediaViewComponent  implements OnInit {

  imageSelected = '';

  commentsExpanded = false;

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  get commentsCount(): number {
    const publication = this.data?.publication;
    if (!publication) return 0;

    if ((this.data.images?.length ?? 0) > 1) {
      const media = publication.media?.find(m => m._id === this.imageSelected);
      return media?.comments?.length ?? 0;
    }

    return publication.comment?.length ?? 0;
  }

  toggleComments(): void {
    this.commentsExpanded = !this.commentsExpanded;
    this._cdr.markForCheck();
  }

  private destroy$ = new Subject<void>();

  constructor(
    private _deviceDetectionService: DeviceDetectionService,
    private _cdr: ChangeDetectorRef,
    private _notificationService: NotificationService,
    private _notificationPublicationService: NotificationPublicationService,
    private _dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: {
      images: ImageOrganizer[],
      imageSelected: ImageOrganizer,
      comment: Comment,
      publication: PublicationView,
      type: string,
    }
  ) {
    if (data) {
      this.data = data
    }
  }

  ngOnInit() {
    this.subscriptionNotification();
    this.subscriptionUpdatePublication();
  }

  private subscriptionUpdatePublication(): void {
    this._notificationPublicationService.notificationUpdatePublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((data: PublicationView[]) => !!data?.[0]?._id && data[0]._id === this.data?.publication?._id),
      )
      .subscribe({
        next: (data: PublicationView[]) => {
          const updatedPublication = data[0];
          if (updatedPublication) {
            this.data.publication = { ...updatedPublication };
            this._cdr.markForCheck();
          }
        },
      });
  }

  private subscriptionNotification(): void {
    this._notificationService.notification$
      .pipe(
        distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {
          if (data?._id === this.data.publication._id) {
            this._cdr.markForCheck();
          }
        }
     });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onImageChanged(imageId: string) {
    this.imageSelected = imageId;
    const selectedImage = this.data.images.find(img => img._id === imageId);
    if (selectedImage) {
      this.data.imageSelected = selectedImage;
    }
    this._cdr.markForCheck();
  }

  close(): void {
    this._dialog.closeAll();
  }

}
