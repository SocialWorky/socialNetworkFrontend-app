import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CustomReactionsService } from '@admin/shared/manage-reactions/service/customReactions.service';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { ReactionsService } from '@shared/services/core-apis/reactions.service';
import { AuthService } from '@auth/services/auth.service';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { PublicationsReactions } from '@shared/interfaces/reactions.interface';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { CenterSocketNotificationsService } from '@shared/services/notifications/centerSocketNotifications.service';
import { Token } from '@shared/interfaces/token.interface';
import { UtilityService } from '@shared/services/utility.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { environment } from '@env/environment';
import { FeatureWallService } from '@shared/services/feature-wall.service';
import { SubscriptionService } from '@shared/services/subscription.service';
import { ConfigService } from '@services/core-apis/config.service';

@Component({
    selector: 'worky-reactions',
    templateUrl: './reactions.component.html',
    styleUrls: ['./reactions.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
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

  token: Token | null = this._authService.getDecodedToken();

  unlockReactions = false; // Start with loading state

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
    private _notificationService: NotificationService,
    private _centerSocketNotificationsService: CenterSocketNotificationsService,
    private _utilityService: UtilityService,
    private _logService: LogService,
    private readonly _featureWallService: FeatureWallService,
    private readonly _subscriptionService: SubscriptionService,
    private readonly _configService: ConfigService,
  ) {}

  ngOnInit() {
    this.loadReactions();
  }

  ngAfterViewInit() {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get normalized emoji URL for display
   */
  getNormalizedEmojiUrl(emojiUrl: string): string {
    if (!emojiUrl) return '';
    return this._utilityService.normalizeImageUrl(emojiUrl, environment.MINIO_BUCKET_URL || '');
  }

  private _reactionsFeatureBlocked(): boolean {
    return this._configService.subscriptionModeSnapshot()
      && this._subscriptionService.isPremiumSnapshot()
      && !this._subscriptionService.hasFeature('reactions');
  }

  addReaction(reaction: CustomReactionList) {
    if (this._reactionsFeatureBlocked()) {
      this._featureWallService.show('reactions', this._subscriptionService.getPlanFeatures());
      return;
    }
    this.hideReactions();
    this.unlockReactions = false;
    
    // Safety timeout to prevent skeleton from getting stuck
    const safetyTimeout = setTimeout(() => {
      if (!this.unlockReactions) {
        this.unlockReactions = true;
        this._cdr.markForCheck();
      }
    }, 10000); // 10 seconds timeout
    
    if (this.reactionUserInPublication) {
      clearTimeout(safetyTimeout);
      this.editReaction(this.reactionUserInPublication._id, reaction);
      return;
    }
    
    this._reactionsService
      .createReaction({
        authorId: this.token?.id!,
        _idCustomReaction: reaction._id,
        isPublications: this.type === TypePublishing.POST || TypePublishing.POST_PROFILE ? true : false,
        isComment: this.type === TypePublishing.COMMENT ? true : false,
        _idPublication: this.publication?._id!,
      }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.notifyPublicationOwner(reaction);
          try {
            const publicationsUpdated = await firstValueFrom(
              this._publicationService.getPublicationId(this.publication?._id!, true).pipe(takeUntil(this.destroy$))
            );

            if (publicationsUpdated && publicationsUpdated.length > 0) {
              const updatedPublication = publicationsUpdated[0];
              this._publicationService.updatePublications(publicationsUpdated);
              this.publication = updatedPublication;
              this.reactionsToPublication = [...(updatedPublication.reaction || [])];
              this._cdr.markForCheck();
            }

            this.reactionsVisible = false;
            this._notificationService.sendNotification(this.publication);
            this.refreshPublications();
          } catch (error) {
            // Handle any errors in the async operations
          } finally {
            clearTimeout(safetyTimeout);
            this.unlockReactions = true;
            this._cdr.markForCheck();
          }
        },
        error: (err) => {
          clearTimeout(safetyTimeout);
          this.unlockReactions = true;
          this._cdr.markForCheck();
        }
      });
  }



  private notifyPublicationOwner(reaction: CustomReactionList) {
    const isPublicationReaction =
      this.type === TypePublishing.POST || this.type === TypePublishing.POST_PROFILE;
    const authorId = this.publication?.author?._id;
    if (!isPublicationReaction || !authorId || authorId === this.token?.id) return;

    this._centerSocketNotificationsService.reactionInPublicationNotification(this.publication!, reaction);
  }

  async deleteReaction(idReaction: string) {
    if (this._reactionsFeatureBlocked()) {
      this._featureWallService.show('reactions', this._subscriptionService.getPlanFeatures());
      return;
    }
    this.hideReactions();
    this.unlockReactions = false;

    // Safety timeout to prevent skeleton from getting stuck
    const safetyTimeout = setTimeout(() => {
      if (!this.unlockReactions) {
        this.unlockReactions = true;
        this._cdr.markForCheck();
      }
    }, 10000); // 10 seconds timeout

    try {
      await firstValueFrom(
        this._reactionsService.deleteReaction(idReaction).pipe(takeUntil(this.destroy$))
      );

      if (this.publication?.reaction) {
        const index = this.publication.reaction.findIndex(r => r._id === idReaction);
        if (index !== -1) {
          this.publication.reaction = [
            ...this.publication.reaction.slice(0, index),
            ...this.publication.reaction.slice(index + 1)
          ];
        }
      }

      const publicationsUpdated = await firstValueFrom(
        this._publicationService.getPublicationId(this.publication?._id!, true).pipe(takeUntil(this.destroy$))
      );

      if (publicationsUpdated && publicationsUpdated.length > 0) {
        this._publicationService.updatePublications(publicationsUpdated);
        this.publication = publicationsUpdated[0];
        this._cdr.markForCheck();
      }

      this.reactionsVisible = false;
      await this._notificationService.sendNotification(this.publication);
      this.hideReactions();
      this.refreshPublications();

    } catch (err) {
      // Handle error silently or with appropriate logging
    } finally {
      clearTimeout(safetyTimeout);
      this.unlockReactions = true;
      this._cdr.markForCheck();
    }
  }

  editReaction(id: string, reaction: CustomReactionList) {
    if (this._reactionsFeatureBlocked()) {
      this._featureWallService.show('reactions', this._subscriptionService.getPlanFeatures());
      return;
    }
    this.hideReactions();
    this.unlockReactions = false;
    
    // Safety timeout to prevent skeleton from getting stuck
    const safetyTimeout = setTimeout(() => {
      if (!this.unlockReactions) {
        this.unlockReactions = true;
        this._cdr.markForCheck();
      }
    }, 10000); // 10 seconds timeout
    
    this._reactionsService.editReaction(id, {
      authorId: this.token?.id!,
      _idCustomReaction: reaction._id,
      isPublications: this.type === TypePublishing.POST || this.typePublishing.POST_PROFILE ? true : false,
      isComment: this.type === TypePublishing.COMMENT ? true : false,
      _idPublication: this.publication?._id!,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        try {
          const publicationsUpdated = await firstValueFrom(
            this._publicationService.getPublicationId(this.publication?._id!, true).pipe(takeUntil(this.destroy$))
          );

          if (publicationsUpdated) {
            this._publicationService.updatePublications(publicationsUpdated);
            this.publication = publicationsUpdated[0];
            this._cdr.markForCheck();
          }

          this._notificationService.sendNotification(this.publication);
          this.refreshPublications();
        } catch (error) {
          // Handle any errors in the async operations
        } finally {
          clearTimeout(safetyTimeout);
          this.unlockReactions = true;
          this._cdr.markForCheck();
        }
      },
      error: (err) => {
        clearTimeout(safetyTimeout);
        this.unlockReactions = true;
        this._cdr.markForCheck();
      }
    });
  }

  loadReactions() {
    this.unlockReactions = false; // Show skeleton while loading
    this._cdr.markForCheck();
    
    this._customReactionsService.getCustomReactionsAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (reactions: CustomReactionList[]) => {
        this.reactions = reactions
          .filter(reaction => reaction.isDeleted === false)
          .map((reaction) => ({
            ...reaction,
            zoomed: false
          }));
        this.unlockReactions = true; // Hide skeleton after loading
        this._cdr.markForCheck();
      },
      error: (err) => {
        this.unlockReactions = true; // Hide skeleton on error
        this._cdr.markForCheck();
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

  refreshPublications() {
    if (!this.publication?._id) return;

    this._publicationService.getPublicationId(this.publication._id, true).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (publicationList: PublicationView[]) => {
        if (publicationList.length > 0) {
          const updatedPublication = structuredClone(publicationList[0]);

          this.publication = updatedPublication;
          this.reactionsToPublication = [...(updatedPublication.reaction || [])];

          this._publicationService.updatePublications(publicationList);
          this._cdr.markForCheck();
        }
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ReactionsComponent',
          'Failed to refresh publications',
          { error }
        );
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

  onImageError(event: Event): void {
    this._utilityService.handleImageError(event, 'assets/img/shared/handleImageError.png');
  }
}
