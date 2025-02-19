import { ChangeDetectorRef, Component, Input, OnDestroy, signal, SimpleChanges } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { catchError, filter, of, Subject, switchMap, takeUntil } from 'rxjs';

import { AuthService } from '@auth/services/auth.service';
import { PublicationView, Comment } from '@shared/interfaces/publicationView.interface';
import { ImageOrganizer, TypeView } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';
import { CommentService } from '@shared/services/core-apis/comment.service';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';
import { AxiomService } from '@shared/services/apis/axiom.service';
import { AxiomType } from '@shared/interfaces/axiom.enum';

@Component({
  selector: 'worky-body-view-content',
  templateUrl: './body-view-content.component.html',
  styleUrls: ['./body-view-content.component.scss'],
})
export class BodyViewContentComponent  implements OnDestroy {

  dataUser = this._authService.getDecodedToken();

  typeViewEnum = TypeView;

  typePublishingEnum = TypePublishing;

  type?: TypePublishing = TypePublishing.IMAGEVIEW;

  dataViewContent: any;

  @Input() images: ImageOrganizer[] = [];

  @Input() imageSelected?: string;

  @Input() publications? = signal<PublicationView[]>([]);

  @Input() comment? = signal<Comment[]>([]);

  @Input() typeView?: string = TypeView.PUBLICATION;

  private destroy$ = new Subject<void>();

  constructor(
    private _authService: AuthService,
    private _loadingCtrl: LoadingController,
    private _commentService: CommentService,
    private _cdr: ChangeDetectorRef,
    private _publicationService: PublicationService,
    private _axiomService: AxiomService,
    private _notificationPublicationService: NotificationPublicationService,
  ) { 
    this.subscribeToNotificationUpdatePublication();
  }

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

    private async subscribeToNotificationUpdatePublication() {
    this._notificationPublicationService.notificationUpdatePublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((data: PublicationView[]) => !!data?.[0]?._id),
        switchMap((data: PublicationView[]) => {
          const notification = data[0];
          return this._publicationService.getPublicationId(notification._id).pipe(
            catchError((error) => {
              this._axiomService.sendLog({
                message: 'Error al obtener publicación actualizada',
                component: 'BodyViewContentComponent',
                type: AxiomType.ERROR,
                error: error,
              });
              return of([]);
            })
          );
        }),
        filter((publication: PublicationView[]) => publication.length > 0),
      )
      .subscribe({
        next: (publication: PublicationView[]) => {
          const updatedPublication = publication[0];

          if(this.typeView === TypeView.PUBLICATION && this.publications){
            const publicationsCurrent = this.publications();
            if (publicationsCurrent) {
              const updatedPublications = publicationsCurrent.map(pub =>
                pub._id === updatedPublication._id ? updatedPublication : pub
              );
              this.publications.set(updatedPublications);
            }
          } else if (this.typeView === TypeView.COMMENT && this.comment) {
            const commentCurrent = this.comment();
            if (commentCurrent) {
              const updatedComment = commentCurrent.map(com =>
                com._id === updatedPublication._id ? updatedPublication : com
              );
              this.comment.set(updatedComment);
            }
          } 


          this._cdr.markForCheck(); // Marcar para detección de cambios
        },
        error: (error) => {
          this._axiomService.sendLog({
            message: 'Error en suscripción de notificaciones de actualizar publicaciones',
            component: 'HomeComponent',
            type: AxiomType.ERROR,
            error: error,
          });
        },
      });
  }

  getCommentImageSelected() {
    const currentPublication = this.publications?.()[0];
    for (const media of currentPublication?.media || []) {
      if (media._id === this.imageSelected) {
        return media.comments;
      }
    }
    return [];
  }

  getCommentImageCommentSelected() {
    const currentComment = this.comment?.()[0];
    for (const media of currentComment?.media || []) {
      if (media._id === this.imageSelected) {
        return media.comments;
      }
    }
    return [];
  }

  shouldShowComments(): boolean {
    const currentPublication = this.publications?.()[0];
    return ((currentPublication?.comment?.length ?? 0) > 0 && this.images.length === 1 && this.typeView === this.typeViewEnum.PUBLICATION) ||
           ((currentPublication?.media?.length ?? 0) > 0 && this.images.length > 1 && this.typeView === this.typeViewEnum.PUBLICATION) ||
           ((this.comment?.()[0]?.media?.length ?? 0) > 0 && this.typeView === this.typeViewEnum.COMMENT);
  }

  getComments() {
    const currentPublication = this.publications?.()[0];
    if (currentPublication?.comment?.length && this.images.length === 1 && this.typeView === this.typeViewEnum.PUBLICATION) {
      return currentPublication.comment;
    }
    
    if (currentPublication?.media?.length && this.images.length > 1 && this.typeView === this.typeViewEnum.PUBLICATION) {
      return this.getCommentImageSelected();
    }

    if (this.comment?.()[0]?.media?.length && this.typeView === this.typeViewEnum.COMMENT) {
      return this.getCommentImageCommentSelected();
    }

    return [];
  }

  get currentPublication(): PublicationView | undefined {
    return this.publications?.()[0];
  }

  get currentPublicationId(): string {
    return this.currentPublication?._id || '';
  }

}
