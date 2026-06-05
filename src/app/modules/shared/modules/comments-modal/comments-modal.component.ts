import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';

import { Comment, PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePublishing } from '../addPublication/enum/addPublication.enum';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { CommentService } from '@shared/services/core-apis/comment.service';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-comments-modal',
  templateUrl: './comments-modal.component.html',
  styleUrls: ['./comments-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CommentsModalComponent implements OnInit, OnDestroy {
  typePublishing = TypePublishing;

  dataUser: Token | null = null;

  isDeletingComment = false;

  translations = translations;

  private destroy$ = new Subject<void>();

  constructor(
    private _authService: AuthService,
    private _commentService: CommentService,
    private _publicationService: PublicationService,
    private _notificationService: NotificationService,
    private _notificationPublicationService: NotificationPublicationService,
    private _alertService: AlertService,
    private _logService: LogService,
    private _cdr: ChangeDetectorRef,
    private _dialogRef: MatDialogRef<CommentsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      publication: PublicationView,
      idMedia?: string,
    },
  ) {}

  ngOnInit(): void {
    this.dataUser = this._authService.getDecodedToken();
    this.subscriptionNotification();
    this.subscriptionUpdatePublication();
  }

  private subscriptionUpdatePublication(): void {
    this._notificationPublicationService.notificationUpdatePublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((data: PublicationView[]) => !!data?.[0]?._id && data[0]._id === this.data.publication._id),
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
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (data: any) => {
          if (data?._id === this.data.publication._id) {
            this._cdr.markForCheck();
          }
        },
      });
  }

  get comments(): Comment[] {
    return this.data.publication?.comment ?? [];
  }

  trackByCommentId(_index: number, comment: Comment): string {
    return comment._id;
  }

  close(): void {
    this._dialogRef.close();
  }

  async deleteComment(_id: string, id_publication: string): Promise<void> {
    this._alertService.showConfirmation(
      translations['publicationsView.deleteCommentTitle'],
      translations['publicationsView.deleteCommentWarning'],
      translations['publicationsView.delete'],
      translations['publicationsView.cancel'],
      Alerts.WARNING,
      Position.CENTER,
    ).pipe(
      takeUntil(this.destroy$),
    ).subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.isDeletingComment = true;
      this._cdr.markForCheck();

      this._commentService.deleteComment(_id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.updateLocalCommentState(_id);
          this.isDeletingComment = false;
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'CommentsModalComponent',
            'Error deleting comment',
            { error, commentId: _id, publicationId: id_publication },
          );
          this.isDeletingComment = false;
          this._cdr.markForCheck();
        },
      });
    });
  }

  private updateLocalCommentState(deletedCommentId: string): void {
    if (this.data.publication && this.data.publication.comment) {
      this.data.publication.comment = this.data.publication.comment.filter(
        comment => comment._id !== deletedCommentId,
      );
      this._publicationService.updatePublicationsLocal([this.data.publication]);
      this._cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
