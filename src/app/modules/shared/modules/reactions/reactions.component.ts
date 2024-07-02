import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { CustomReactionsService } from '@admin/shared/manage-reactions/service/customReactions.service';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { ReactionsService } from '@shared/services/reactions.service';
import { AuthService } from '@auth/services/auth.service';
import { PublicationService } from '@shared/services/publication.service';
import { PublicationsReactions } from '@shared/interfaces/reactions.interface';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { MailSendValidateData, TemplateEmail } from '@shared/interfaces/mail.interface';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { NotificationService } from '@shared/services/notifications/notification.service';

@Component({
  selector: 'worky-reactions',
  templateUrl: './reactions.component.html',
  styleUrls: ['./reactions.component.scss'],
})
export class ReactionsComponent implements OnInit, OnDestroy {
  reactionsVisible = false;

  reactions: Array<CustomReactionList & { zoomed: boolean }> = [];

  typePublishing = TypePublishing;

  @Input() type: TypePublishing | undefined;

  @Input() userProfile?: string;

  @Input() publication: PublicationView | undefined;

  @Input() reactionsToPublication: PublicationsReactions[] = [];

  token = this._authService.getDecodedToken();

  private mailSendNotification: MailSendValidateData = {} as MailSendValidateData;

  private destroy$ = new Subject<void>();

  private touchTimeout: any;

  get reactionUserInPublication() {
    return this.reactionsToPublication.find((reaction) => reaction.user._id === this.token?.id);
  }

  constructor(
    private _customReactionsService: CustomReactionsService,
    private _cdr: ChangeDetectorRef,
    private _reactionsService: ReactionsService,
    private _authService: AuthService,
    private _publicationService: PublicationService,
    private _emailNotificationService: EmailNotificationService,
    private _notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadReactions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addReaction(reaction: CustomReactionList) {
    if (this.reactionUserInPublication) {
      this.editReaction(this.reactionUserInPublication._id, reaction);
      return;
    }
    this._reactionsService
      .createReaction({
        authorId: this.token?.id!,
        _idCustomReaction: reaction._id,
        isPublications: this.type === TypePublishing.POST || TypePublishing.POSTPROFILE ? true : false,
        isComment: this.type === TypePublishing.COMMENT ? true : false,
        _idPublication: this.publication?._id!,
      }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.reactionsVisible = false;
          this._emailNotificationService.reactionsNotification(this.publication!, reaction);

          if(this.publication?.author._id === this.token?.id) return;

          this.refreshPublications();
        },
        error: (err) => {
          console.error('Failed to add reaction', err);
        }
      });
  }

  deleteReaction(idReaction: string) {
    this._reactionsService.deleteReaction(idReaction).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this._notificationService.sendNotification(this.publication);
        this.refreshPublications();
      },
      error: (err) => {
        console.error('Failed to delete reaction', err);
      }
    });
  }

  editReaction(id: string, reaction: CustomReactionList) {
    this._reactionsService.editReaction(id, {
      authorId: this.token?.id!,
      _idCustomReaction: reaction._id,
      isPublications: this.type === TypePublishing.POST || this.typePublishing.POSTPROFILE ? true : false,
      isComment: this.type === TypePublishing.COMMENT ? true : false,
      _idPublication: this.publication?._id!,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this._notificationService.sendNotification(this.publication);
        this.refreshPublications();
      },
      error: (err) => {
        console.error('Failed to edit reaction', err);
      }
    });
  }

  loadReactions() {
    this._customReactionsService.getCustomReactionsAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (reactions: CustomReactionList[]) => {
        this.reactions = reactions.map((reaction) => ({
          ...reaction,
          zoomed: false
        }));
        this._cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load reactions', err);
      }
    });
  }

  showReactions() {
    this.reactionsVisible = true;
  }

  hideReactions() {
    this.reactionsVisible = false;
  }

  zoomIn(reaction: CustomReactionList & { zoomed: boolean }) {
    reaction.zoomed = true;
  }

  zoomOut(reaction: CustomReactionList & { zoomed: boolean }) {
    reaction.zoomed = false;
  }

  async refreshPublications() {
    if (!this.publication?._id) return;

    this._publicationService.getPublicationId(this.publication._id).pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: (publications: PublicationView[]) => {
        this._publicationService.updatePublications(publications);
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  onTouchStart() {
    this.touchTimeout = setTimeout(() => {
      this.showReactions();
    }, 500);
  }

  onTouchEnd() {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
    }
  }
}
