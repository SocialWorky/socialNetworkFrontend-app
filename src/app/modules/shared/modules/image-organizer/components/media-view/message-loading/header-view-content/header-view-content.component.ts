import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PublicationView, Comment } from '@shared/interfaces/publicationView.interface';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import * as _ from 'lodash';

import { TypePrivacy, TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { Reactions } from '@shared/modules/publication-view/interfaces/reactions.interface';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { ImageOrganizer, TypeView } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';

@Component({
  selector: 'worky-header-view-content',
  templateUrl: './header-view-content.component.html',
  styleUrls: ['./header-view-content.component.scss'],
})
export class HeaderViewContentComponent  implements OnInit, OnDestroy {

  typePrivacy = TypePrivacy;

  typeViewEnum = TypeView;

  type?: TypePublishing = TypePublishing.IMAGEVIEW;

  listReaction: string[] = [];

  contentView: any;

  @Input() images: ImageOrganizer[] = [];

  @Input() publication?: PublicationView;

  @Input() typeView?: string = TypeView.PUBLICATION;

  @Input() comment?: Comment;

  private destroy$ = new Subject<void>();

  constructor(
    private _cdr: ChangeDetectorRef,
    private _notificationService: NotificationService,
    private _publicationService: PublicationService,
  ) { }

  ngOnInit() {
    this.typeView === TypeView.COMMENT ? this.contentView = this.comment : this.contentView = this.publication;

    this._notificationService.notification$
      .pipe(
        distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {
          if (this.publication && data?._id === this.publication._id) {
            this.refreshPublications(data._id);
            this.loadReactionsImg(data);
            this._cdr.detectChanges();
          }
        }
      });
    this.loadReactionsImg();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReactionsImg(publication: PublicationView = this.publication!){
    this.listReaction = [];
    if (publication) {
      publication.reaction.forEach((element: Reactions) => {
        if(this.listReaction.includes(element.customReaction.emoji)) return;
        this.listReaction.push(element.customReaction.emoji);
        this._cdr.markForCheck();
      });
    }
  }

  refreshPublications(_id?: string) {
    if (_id) {
      this._publicationService.getPublicationId(_id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (publication: PublicationView[]) => {
          this._publicationService.updatePublications(publication);
          this.publication = publication[0];
          this.loadReactionsImg(publication[0]);
          this._cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to refresh publications', error);
        }
      });
    }
  }

}
