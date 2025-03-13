import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialog  } from '@angular/material/dialog';
import * as _ from 'lodash';

import { ImageOrganizer } from '../../interfaces/image-organizer.interface';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { Comment, PublicationView } from '@shared/interfaces/publicationView.interface';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { NotificationService } from '@shared/services/notifications/notification.service';

@Component({
  selector: 'worky-media-view',
  templateUrl: './media-view.component.html',
  styleUrls: ['./media-view.component.scss'],
})
export class MediaViewComponent  implements OnInit {

  imageSelected = '';

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  private destroy$ = new Subject<void>();

  constructor( 
    private _deviceDetectionService: DeviceDetectionService,
    private _cdr: ChangeDetectorRef,
    private _publicationService: PublicationService,
    private _notificationService: NotificationService,
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
    //this.subscriptionPublication();
    this.subscriptionNotification();
  }

  // private subscriptionPublication(): void {
  //   this._publicationService.publications$
  //     .pipe(
  //       distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
  //       takeUntil(this.destroy$)
  //     )
  //     .subscribe({
  //       next: (dat: PublicationView[]) => {
  //         if (dat.filter((d: PublicationView) => d._id === this.data.publication._id).length > 0) {
  //           this.data.publication = dat.filter((d: PublicationView) => d._id === this.data.publication._id)[0];
  //           if (!this.data.comment) {
  //             this.data.images = this.data.publication.media;
  //           }
  //           if (this.data.comment) {
  //             const foundComment = this.data.publication.comment.find((comment: Comment) => comment._id === this.data.comment._id);
  //             if (foundComment) {
  //               this.data.comment = foundComment;
  //             }
  //           }
  //           this._cdr.markForCheck();
  //         }
  //       }
  //     });
  // }

  private subscriptionNotification(): void {
    this._notificationService.notification$
      .pipe(
        distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {
          if (data?._id === this.data.publication._id) {
            //this.subscriptionPublication();
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
    this._cdr.detectChanges();
  }

  close(): void {
    this._dialog.closeAll();
  }

}
