import { ChangeDetectorRef, Component, Input, OnDestroy, SimpleChanges } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '@auth/services/auth.service';
import { PublicationView, Comment } from '@shared/interfaces/publicationView.interface';
import { ImageOrganizer, TypeView } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';
import { CommentService } from '@shared/services/comment.service';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationService } from '@shared/services/publication.service';

@Component({
  selector: 'worky-body-view-content',
  templateUrl: './body-view-content.component.html',
  styleUrls: ['./body-view-content.component.scss'],
})
export class BodyViewContentComponent  implements OnDestroy {

  dataUser = this._authService.getDecodedToken();

  typeViewEnum = TypeView;

  type?: TypePublishing = TypePublishing.IMAGEVIEW;

  dataViewContent: any;

  @Input() images: ImageOrganizer[] = [];

  @Input() imageSelected?: string;

  @Input() publication?: PublicationView;

  @Input() comment?: Comment;

  @Input() typeView?: string = TypeView.PUBLICATION;

  private destroy$ = new Subject<void>();

  constructor(
    private _authService: AuthService,
    private _loadingCtrl: LoadingController,
    private _commentService: CommentService,
    private _cdr: ChangeDetectorRef,
    private _publicationService: PublicationService,
  ) { }

  ngOnChanges(changes: SimpleChanges) {
    if (this.typeView === TypeView.COMMENT) {
      this.getCommentImageCommentSelected();
    }
    if (this.typeView === TypeView.PUBLICATION) {
      this.getCommentImageSelected();
    }    
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async deleteComment(_id: string, id_publication: string) {
    const loadingDeleteComment = await this._loadingCtrl.create({
      message: 'Eliminando comentario...',
    });

    await loadingDeleteComment.present();

    this._commentService.deletComment(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this._publicationService.getPublicationId(id_publication).pipe(takeUntil(this.destroy$)).subscribe({
          next: (data: PublicationView[]) => {
            this._publicationService.updatePublications(data);
          }
        })
        loadingDeleteComment.dismiss();
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
        loadingDeleteComment.dismiss();
      }
    });
  }

  getCommentImageSelected() {
    for (const media of this.publication?.media || []) {
      if (media._id === this.imageSelected) {
        return media.comments;
      }
    }
    return [];
  }

  getCommentImageCommentSelected() {
    for (const media of this.comment?.media || []) {
      if (media._id === this.imageSelected) {
        return media.comments;
      }
    }
    return [];
  }

  shouldShowComments(): boolean {
    return ((this.publication?.comment?.length ?? 0) > 0 && this.images.length === 1 && this.typeView === this.typeViewEnum.PUBLICATION) ||
          ((this.publication?.media?.length ?? 0) > 0 && this.images.length > 1 && this.typeView === this.typeViewEnum.PUBLICATION) ||
          ((this.comment?.media?.length ?? 0) > 0 && this.typeView === this.typeViewEnum.COMMENT);
  }

  getComments() {
    if (this.publication?.comment?.length && this.images.length === 1 && this.typeView === this.typeViewEnum.PUBLICATION) {
      return this.publication?.comment;
    }
    
    if (this.publication?.media?.length && this.images.length > 1 && this.typeView === this.typeViewEnum.PUBLICATION) {
      return this.getCommentImageSelected();
    }

    if (this.comment?.media?.length && this.typeView === this.typeViewEnum.COMMENT) {
      return this.getCommentImageCommentSelected();
    }

    return [];
  }

}
