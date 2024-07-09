import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CustomReactionsService } from '@admin/shared/manage-reactions/service/customReactions.service';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { ReactionsService } from '@shared/services/reactions.service';
import { AuthService } from '@auth/services/auth.service';
import { PublicationService } from '@shared/services/publication.service';
import { PublicationsReactions } from '@shared/interfaces/reactions.interface';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { NotificationService } from '@shared/services/notifications/notification.service';

@Component({
  selector: 'worky-reactions',
  templateUrl: './reactions.component.html',
  styleUrls: ['./reactions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReactionsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('reactionPopup') reactionPopup!: ElementRef;

  reactionsVisible = false;
  
  reactions: Array<CustomReactionList & { zoomed: boolean }> = [];
  
  typePublishing = TypePublishing;

  @Input() type: TypePublishing | undefined;
  
  @Input() userProfile?: string;
  
  @Input() publication: PublicationView | undefined;
  
  @Input() reactionsToPublication: PublicationsReactions[] = [];

  token = this._authService.getDecodedToken();
  
  unlockReactions = true;

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

  ngAfterViewInit() {
    this.updateReactionsPopupPosition();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addReaction(reaction: CustomReactionList) {
    this.hideReactions();
    this.unlockReactions = false;
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
          this.unlockReactions = true;
          this._emailNotificationService.reactionsNotification(this.publication!, reaction);

          this.refreshPublications();
          this.updateReactionsPopupPosition();
        },
        error: (err) => {
          console.error('Failed to add reaction', err);
          this.unlockReactions = true;
        }
      });
  }

  deleteReaction(idReaction: string) {
    this.hideReactions();
    this.unlockReactions = false;
    this._reactionsService.deleteReaction(idReaction).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this._notificationService.sendNotification(this.publication);
        this.refreshPublications();
        this.unlockReactions = true;
        this.updateReactionsPopupPosition();
      },
      error: (err) => {
        console.error('Failed to delete reaction', err);
        this.unlockReactions = true;
      }
    });
  }

  editReaction(id: string, reaction: CustomReactionList) {
    this.hideReactions();
    this.unlockReactions = false;
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
        this.unlockReactions = true;
        this.updateReactionsPopupPosition();
      },
      error: (err) => {
        console.error('Failed to edit reaction', err);
        this.unlockReactions = true;
      }
    });
  }

  loadReactions() {
      this._customReactionsService.getCustomReactionsAll().pipe(takeUntil(this.destroy$)).subscribe({
        next: (reactions: CustomReactionList[]) => {
          this.reactions = reactions
            .filter(reaction => reaction.isDeleted === false)
            .map((reaction) => ({
              ...reaction,
              zoomed: false
            }));
          this._cdr.markForCheck();
          this.updateReactionsPopupPosition();
        },
        error: (err) => {
          console.error('Failed to load reactions', err);
        }
      });
    }

  showReactions() {
    this.reactionsVisible = true;
    setTimeout(() => {
      this.updateReactionsPopupPosition();
    }, 0);
  }

  hideReactions() {
    this.reactionsVisible = false;
    this.updateReactionsPopupPosition();
  }

  zoomIn(reaction: CustomReactionList & { zoomed: boolean }) {
    reaction.zoomed = true;
  }

  zoomOut(reaction: CustomReactionList & { zoomed: boolean }) {
    reaction.zoomed = false;
  }

  refreshPublications() {
    if (!this.publication?._id) return;

    this._publicationService.getPublicationId(this.publication._id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (publication: PublicationView[]) => {
        this._publicationService.updatePublications(publication);
      },
      error: (error) => {
        console.error('Failed to refresh publications', error);
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

  private updateReactionsPopupPosition() {
    if (this.reactionPopup) {
      const items = this.reactionPopup.nativeElement.children.length;
      this.reactionPopup.nativeElement.style.setProperty('--num-items', items.toString());
    }
  }
}
