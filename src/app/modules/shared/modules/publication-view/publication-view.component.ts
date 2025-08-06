import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil, debounceTime } from 'rxjs/operators';
import { LoadingController } from '@ionic/angular';
import { MatDialog } from '@angular/material/dialog';
import * as _ from 'lodash';

import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePrivacy, TypePublishing } from '../addPublication/enum/addPublication.enum';
import { DropdownDataLink } from '../worky-dropdown/interfaces/dataLink.interface';
import { AuthService } from '@auth/services/auth.service';
import { RoleUser } from '@auth/models/roleUser.enum';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { environment } from '@env/environment';
import { FriendsService } from '@shared/services/core-apis/friends.service';
import { translations } from '@translations/translations';
import { FriendsStatus, UserData } from '@shared/interfaces/friend.interface';
import { ReportsService } from '@shared/services/core-apis/reports.service';
import { ReportCreate } from '@shared/interfaces/report.interface';
import { ReportType, ReportStatus } from '@shared/enums/report.enum';
import { ReportResponseComponent } from '../publication-view/report-response/report-response.component';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { CommentService } from '@shared/services/core-apis/comment.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { Reactions } from './interfaces/reactions.interface';
import { Colors } from '@shared/interfaces/colors.enum';
import { ScrollService } from '@shared/services/scroll.service';
import { Token } from '@shared/interfaces/token.interface';
import { LoadingService } from '@shared/services/loading.service';
import { ImageLoadOptions } from '../../services/image.service';
import { MediaEventsService } from '@shared/services/media-events.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';


@Component({
    selector: 'worky-publication-view',
    templateUrl: './publication-view.component.html',
    styleUrls: ['./publication-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class PublicationViewComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() publication!: PublicationView;

  @Input() indexPublication?: number;

  @Input() type?: TypePublishing;

  @Input() userProfile?: string;

  typePublishing = TypePublishing;

  typePrivacy = TypePrivacy;

  emojiImageOptions: ImageLoadOptions = {
    maxRetries: 1,
    retryDelay: 300,
    timeout: 3000,
    fallbackUrl: '/assets/images/emoji-placeholder.png'
  };

  dataLinkActions: DropdownDataLink<any>[] = [];

  dataShareActions: DropdownDataLink<any>[] = [];

  viewCommentSection: number | null = null;

  viewComments: number | null = null;

  nameGeoLocation = '';

  urrMap = '';

  extraData: string[] = [];

  userRequest?: UserData;

  userReceive?: UserData;

  routeUrl = '';

  isProfile = false;

  dataUser: Token | null = null;

  listReaction: string[] = [];

  isCodeBlock(content: string): boolean {
    return content.trim().startsWith('```');
  }

  // Estados de carga individuales para skeletons
  avatarLoading: boolean = true;
  nameLoading: boolean = true;
  contentLoading: boolean = true;
  mediaLoading: boolean = true;
  locationLoading: boolean = true;
  dateLoading: boolean = true;
  actionsLoading: boolean = true;
  isDeletingPublication: boolean = false;
  isDeletingComment: boolean = false;
  translations = translations;

  private destroy$ = new Subject<void>();
  private mediaTimeout?: any;
  private mediaState: 'loading' | 'loaded' | 'error' = 'loading';
  private readonly MEDIA_TIMEOUT: number = 3000; // 3 segundos

  constructor(
    private _router: Router,
    private _cdr: ChangeDetectorRef,
    private _authService: AuthService,
    private _loadingCtrl: LoadingController,
    private _publicationService: PublicationService,
    private _commentService: CommentService,
    private _friendsService: FriendsService,
    private _reportsService: ReportsService,
    public _dialog: MatDialog,
    private _emailNotificationService: EmailNotificationService,
    private _notificationService: NotificationService,
    private _scrollService: ScrollService,
    private _loadingService: LoadingService,
    private _mediaEventsService: MediaEventsService,
    private _alertService: AlertService
  ) {}

  async ngAfterViewInit() {
    this.getUserFriendPending();
  }

  ngOnInit() {
    this.dataUser = this._authService.getDecodedToken();
    this.getUserFriendPending();
    this.menuShareActions();
    this.extraDataPublication();
    this.routeUrl = this._router.url;
    this.isProfile = this.routeUrl.includes('profile');

          this._notificationService.notification$
        .pipe(
          distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
          takeUntil(this.destroy$)
        )
      .subscribe({
        next: (data: any) => {
          if (data?._id === this.publication._id) {
            this.updatePublicationIfNeeded(data);
          }
        }
      });

      this._mediaEventsService.mediaProcessed$
        .pipe(
          takeUntil(this.destroy$)
        )
      .subscribe({
        next: (data: any) => {
          if (data?.idReference === this.publication._id) {
            this.handleMediaProcessed(data);
          }
        }
      });
    this.loadReactionsImg();
    this._cdr.markForCheck();
    
    this.simulateProgressiveLoading();
  }

  // Métodos para manejar la carga de elementos individuales
  onAvatarLoad() {
    this.avatarLoading = false;
    this._cdr.markForCheck();
  }

  onAvatarError() {
    this.avatarLoading = false;
    // Force the avatar component to show initials when image fails
    this._cdr.markForCheck();
  }

  onNameLoad() {
    this.nameLoading = false;
    this._cdr.markForCheck();
  }

  onContentLoad() {
    this.contentLoading = false;
    this._cdr.markForCheck();
  }

  onMediaLoad() {
    this.mediaLoading = false;
    this.mediaState = 'loaded';
    this.clearMediaTimeout();
    this._cdr.markForCheck();
  }

  // Force media loading state reset - used when skeleton gets stuck
  forceMediaLoadComplete() {
    this.mediaLoading = false;
    this.mediaState = 'loaded';
    this.clearMediaTimeout();
    this._cdr.markForCheck();
  }

  // Force processing media state reset - used when processing gets stuck
  forceProcessingMediaComplete() {
    this.publication.containsMedia = false;
    this.mediaLoading = false;
    this.mediaState = 'loaded';
    this.clearMediaTimeout();
    this._cdr.markForCheck();
  }

  // Clear media timeout
  private clearMediaTimeout() {
    if (this.mediaTimeout) {
      clearTimeout(this.mediaTimeout);
      this.mediaTimeout = undefined;
    }
  }

  // Force immediate update when media processing completes
  private forceImmediateMediaUpdate(mediaData: any[]) {
    if (mediaData && mediaData.length > 0) {
      this.publication.media = mediaData;
      this.publication.containsMedia = false;
      this.mediaLoading = true;
      this.mediaState = 'loading';
      
      this._cdr.markForCheck();
      
      // Setup media timeout to prevent it from getting stuck
      this.setupMediaTimeout();
    }
  }

  // Setup media timeout to prevent getting stuck
  private setupMediaTimeout() {
    this.clearMediaTimeout();
    this.mediaTimeout = setTimeout(() => {
      this.mediaLoading = false;
      this.mediaState = 'loaded';
      this._cdr.markForCheck();
    }, this.MEDIA_TIMEOUT);
  }

  // Check if media processing is stuck
  isMediaProcessingStuck(): boolean {
    return this.publication.containsMedia && 
           this.publication.media.length === 0 && 
           this.mediaState === 'loading';
  }

  // Public method to manually retry media processing
  retryMediaProcessingManual() {
    this.mediaState = 'loading';
    this.setupMediaTimeout();
    this._cdr.markForCheck();
  }



  private updateLocalPublication(publicationId: string, mediaData: any[]) {
    // Update the current publication object
    this.publication.media = mediaData;
    this.publication.containsMedia = false;
    
    // Force change detection to update the UI immediately
    this._cdr.markForCheck();
    
    // Update the local database (IndexedDB) with the new media data
    // This ensures consistency between the UI and local storage
    this._publicationService.updatePublicationInLocalDatabase(publicationId, {
      media: mediaData,
      containsMedia: false
    }).then(() => {
      // Local database updated successfully
    }).catch((error) => {
      // Error updating local database
    });
  }

  private forceMediaLoadCompleteOnError() {
    this.mediaLoading = false;
    this.mediaState = 'error';
    this.clearMediaTimeout();
    this._cdr.markForCheck();
  }

  onLocationLoad() {
    this.locationLoading = false;
    this._cdr.markForCheck();
  }

  onDateLoad() {
    this.dateLoading = false;
    this._cdr.markForCheck();
  }

  onActionsLoad() {
    this.actionsLoading = false;
    this._cdr.markForCheck();
  }

  // Load all elements immediately without artificial delays
  private simulateProgressiveLoading() {
    // Load all elements immediately
    this.onNameLoad();
    this.onDateLoad();
    this.onLocationLoad();
    this.onActionsLoad();
    
    // Load content if exists
    if (this.publication.content) {
      this.onContentLoad();
    }
    
    // Load avatar - always show avatar component (with or without image)
    this.onAvatarLoad();
    
    // Load media if exists - with safety check
    if (this.publication.media.length > 0) {
      // If media exists, show skeleton first then load
      this.mediaLoading = true;
      this.mediaState = 'loading';
      this.setupMediaTimeout();
      
      // Simulate media loading with a small delay
      setTimeout(() => {
        this.onMediaLoad();
      }, 100);
    } else if (this.publication.containsMedia) {
      // Set up media timeout for processing state
      this.setupMediaTimeout();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clear media timeout to prevent memory leaks
    this.clearMediaTimeout();
  }

  loadReactionsImg(publication: PublicationView = this.publication){
    this.listReaction = [];
    if (publication) {
      publication.reaction.forEach((element: Reactions) => {
        if(this.listReaction.includes(element.customReaction.emoji)) return;
        this.listReaction.push(element.customReaction.emoji);
        this._cdr.markForCheck();
      });
    }
  }

  extraDataPublication() {
    try {
      const extraData = this.publication?.extraData ? JSON.parse(this.publication.extraData as any) : {};
      if (extraData) {
        this.nameGeoLocation = extraData.locations?.title || '';
        this.urrMap = extraData.locations?.urlMap || '';
      }
    } catch (e) {
      console.error('Error in file JSON: ', e);
      this.nameGeoLocation = '';
      this.urrMap = '';
    }
  }

  commentOn(index: number) {
    this.viewCommentSection = this.viewCommentSection === index ? -1 : index;
  }

  viewCommentsOn(index: number) {
    this.viewComments = this.viewComments === index ? -1 : index;
  }

  checkDataLink(userId: string) {
    this.dataLinkActions = [];
    this.menuActions();
    const menuDeletePublications = {
      icon: 'delete',
      function: this.deletePublications.bind(this),
      title: translations['publicationsView.deletePublication']
    };
    const menuFixedPublications = {
      icon: 'push_pin',
      function: this.fixedPublications.bind(this),
      title: !this.publication.fixed ? translations['publicationsView.fixedPublication'] : translations['publicationsView.unfixedPublication']
    };

    if (userId === this.dataUser?.id || this.dataUser?.role === RoleUser.ADMIN) {

      if (this.publication.fixed) {
        if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.unfixedPublication'])) {
          this.dataLinkActions.push(menuFixedPublications);
        }
      } else {
        if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.fixedPublication'])) {
          this.dataLinkActions.push(menuFixedPublications);
        }
      }

      if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.deletePublication'])) {
        this.dataLinkActions.push(menuDeletePublications);
      }
    }
    this._cdr.markForCheck();
  }

  menuActions() {
    this.dataLinkActions = [
      { icon: 'report', function: this.createReport.bind(this), title: translations['publicationsView.reportPublication'] },
    ];
  }

  menuShareActions() {
    const url = environment.BASE_URL;
    this.dataShareActions = [
      {
        img: 'assets/img/logos/svg-facebook.svg',
        linkUrl: `https://web.facebook.com/sharer.php?u=${url}`,
        title: translations['social.facebook']
      },
      {
        img: 'assets/img/logos/twitter-x.svg',
        linkUrl: `https://twitter.com/intent/tweet?url=${url}`,
        title: translations['social.twitter']
      },
      // TODO: Uncomment when the linkedin share is ready
      // {
      //   img: 'assets/img/logos/linkedin.svg',
      //   linkUrl: `https://www.linkedin.com/shareArticle?url=${url}`,
      //   title: translations['social.linkedin']
      // },
      {
        img: 'assets/img/logos/svg-whatsapp.svg',
        linkUrl: `whatsapp://send?text=${url}`,
        title: translations['social.whatsapp']
      },
    ];
  }

  async deletePublications(publication: PublicationView) {
    // Show confirmation alert using AlertService
    this._alertService.showConfirmation(
      translations['publicationsView.deletePublicationTitle'],
      translations['publicationsView.deletePublicationWarning'],
      translations['publicationsView.delete'],
      translations['publicationsView.cancel'],
      Alerts.WARNING,
      Position.CENTER
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        // Show accessible loading immediately after confirmation
        this.isDeletingPublication = true;
        this._cdr.markForCheck(); // Force immediate UI update

        this._publicationService.deletePublication(publication._id).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            this._publicationService.updatePublicationsDeleted([publication]);
            this.isDeletingPublication = false;
            this._cdr.markForCheck();
          },
          error: (error) => {
            console.error(error);
            this.isDeletingPublication = false;
            this._cdr.markForCheck();
          },
        });
      }
    });
  }

  async fixedPublications(publication: PublicationView) {
    // Usar el nuevo sistema de loading accesible
    const loading = await this._loadingService.showLoading(
      !publication.fixed ? translations['publicationsView.loadingFixedPublication'] : translations['publicationsView.loadingUnfixedPublication']
    );

    this._publicationService.updatePublicationById(publication._id, { fixed: !publication.fixed }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.refreshPublications(publication._id);
        this._loadingService.hideLoading();
      },
      error: (error) => {
        console.error(error);
        this._loadingService.hideLoading();
      },
    });
  }

  handleActionsClicked(data: DropdownDataLink<any>, publication: any) {
    if (data.function && typeof data.function === 'function') {
      data.function(publication);
    } else if (data.link) {
      this._router.navigate([data.link]);
    } else if (data.linkUrl) {
      const newLink = data.linkUrl + '/publication/' + publication._id + '/';
      window.open(newLink, '_blank');
    }
  }

  async followMyFriend(_idUser: string) {
    this._friendsService.requestFriend(_idUser).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this._emailNotificationService.sendFriendRequestNotification(_idUser);
        this.viewProfile(_idUser);
      },
      error: (error) => {
        console.error('Error the send request', error);
      }
    });
  }

  cancelFriendship(_id: string, authorId: string) {
    this._friendsService.deleteFriend(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.viewProfile(authorId);
      }
    });
  }

  getUserFriendPending() {
    this._friendsService.getIsMyFriend(this.dataUser?.id!, this.publication?.author?._id || '').pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: FriendsStatus) => {
        this.userRequest = response?.requester;
        this.userReceive = response?.receiver;
        this._cdr.markForCheck();
      },
      error: (error: any) => {
        console.error(error);
      },
    });
  }

  acceptFriendship(_id: string, idUser: string) {
    this._friendsService.acceptFriendship(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.getUserFriendPending();
        this._emailNotificationService.acceptFriendRequestNotification(idUser);
        this.viewProfile(idUser);
      }
    });
  }

  viewProfile(_id: string) {
    this._router.navigate(['/profile', _id]);
  }

  refreshPublications(_id?: string) {
    if (_id) {
      this._publicationService.getPublicationId(_id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (publication: PublicationView[]) => {
          if (!publication.length) {
            return;
          }
          
          const updatedPublication = publication[0];
          
          const hasMediaChanges = 
            this.publication.media.length !== updatedPublication.media.length ||
            this.publication.containsMedia !== updatedPublication.containsMedia ||
            JSON.stringify(this.publication.media) !== JSON.stringify(updatedPublication.media);
          
          const hasOtherChanges = 
            this.publication.reaction.length !== updatedPublication.reaction.length ||
            this.publication.comment.length !== updatedPublication.comment.length ||
            this.publication.fixed !== updatedPublication.fixed ||
            JSON.stringify(this.publication.reaction) !== JSON.stringify(updatedPublication.reaction);
          
          if (hasMediaChanges || hasOtherChanges) {
            this._publicationService.updatePublicationsLocal(publication);
            this.publication = updatedPublication;
            this.loadReactionsImg(updatedPublication);
            this.checkDataLink(updatedPublication._id);
            
            if (hasMediaChanges) {
              this.mediaLoading = false;
            }
            
            this._cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Failed to refresh publications', error);
        }
      });
    }
  }

  createReport(publication: PublicationView) {
    this.openUploadModal(publication);
  }

  async openUploadModal(publication: PublicationView) {
    const dialogRef = this._dialog.open(ReportResponseComponent, {});
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(async (result: any) => {
      if (result) {
        const loading = await this._loadingService.showLoading(translations['shared.reportResponse.title']);

        const report: ReportCreate = {
          type: ReportType.POST,
          _idReported: publication._id,
          reporting_user: this.dataUser?.id!,
          status: ReportStatus.PENDING,
          detail_report: result,
        };
        this._reportsService.createReport(report).pipe(takeUntil(this.destroy$)).subscribe({
          next: (data) => {
            this._loadingService.hideLoading();
            this._emailNotificationService.sendEmailNotificationReport(publication, result);
            this._cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error creating report:', error);
            this._loadingService.hideLoading();
          }
        });
      }
    });
  }

  async deleteComment(_id: string, id_publication: string) {
    // Show confirmation alert using AlertService
    this._alertService.showConfirmation(
      translations['publicationsView.deleteCommentTitle'],
      translations['publicationsView.deleteCommentWarning'],
      translations['publicationsView.delete'],
      translations['publicationsView.cancel'],
      Alerts.WARNING,
      Position.CENTER
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        // Show accessible loading immediately after confirmation
        this.isDeletingComment = true;
        this._cdr.markForCheck(); // Force immediate UI update

        this._commentService.deleteComment(_id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.refreshPublications(id_publication);
            this.isDeletingComment = false;
            this._cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error deleting comment:', error);
            this.isDeletingComment = false;
            this._cdr.markForCheck();
          }
        });
      }
    });
  }

  onEmojiError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  onMediaLoadError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
    
    this.mediaLoading = false;
    this.mediaState = 'error';
    this.clearMediaTimeout();
    this._cdr.markForCheck();
  }

  private updatePublicationIfNeeded(updatedData: any) {
    const hasMediaChanges = 
      this.publication.media.length !== updatedData.media?.length ||
      this.publication.containsMedia !== updatedData.containsMedia ||
      JSON.stringify(this.publication.media) !== JSON.stringify(updatedData.media);
    
    const hasOtherChanges = 
      this.publication.reaction.length !== updatedData.reaction?.length ||
      this.publication.comment.length !== updatedData.comment?.length ||
      this.publication.fixed !== updatedData.fixed ||
      JSON.stringify(this.publication.reaction) !== JSON.stringify(updatedData.reaction);

    if (hasMediaChanges || hasOtherChanges) {
      if (hasMediaChanges) {
        this.handleMediaUpdate(updatedData);
        
        // If media was added, setup media timeout
        if (updatedData.media && updatedData.media.length > 0) {
          this.setupMediaTimeout();
        }
      }
      
      // Add small delay to ensure UI updates properly
      setTimeout(() => {
        this.refreshPublications(updatedData._id);
        this.loadReactionsImg(updatedData);
      }, 100);
    }
  }

  private handleMediaUpdate(updatedData: any) {
    this.publication.media = updatedData.media || [];
    this.publication.containsMedia = updatedData.containsMedia || false;
    
    // Ensure media loading state is properly updated
    if (this.publication.media.length > 0) {
      this.mediaLoading = false;
      this.mediaState = 'loaded';
      this.clearMediaTimeout();
    }
    
    this._cdr.markForCheck();
  }

  private handleMediaProcessed(data: any) {
    this.clearMediaTimeout();
    this.publication.containsMedia = false;
    
    // Update the publication with the processed media data
    if (data.media && data.media.length > 0) {
      this.forceImmediateMediaUpdate(data.media);
      
      // Update the local database with the new media data
      this.updateLocalPublication(data.idReference, data.media);
    } else {
      this.mediaLoading = false;
      this.mediaState = 'loaded';
      this._cdr.markForCheck();
    }
  }

  // Computed properties for template optimization
  get shouldShowFriendActions(): boolean {
    return !this.nameLoading && 
           !this.avatarLoading && 
           (this.publication.isMyFriend || 
            this.isUserReceiving || 
            this.isAuthor);
  }

  get isUserReceiving(): boolean {
    return this.dataUser?.id === this.publication.userReceiving?._id && !this.publication.isMyFriend;
  }

  get isAuthor(): boolean {
    return this.dataUser?.id === this.publication.author._id && !this.publication.isMyFriend;
  }

  get shouldShowFollowButton(): boolean {
    return !this.publication.isMyFriend && (!this.userRequest?._id || !this.userReceive?._id);
  }

  get shouldShowCancelButton(): boolean {
    return !this.publication.isMyFriend && 
           !!this.publication.isFriendshipPending && 
           this.userRequest?._id === this.dataUser?.id;
  }

  get shouldShowAcceptButton(): boolean {
    return this.userReceive?._id === this.dataUser?.id;
  }

  get shouldShowPendingIndicator(): boolean {
    return !this.publication.isMyFriend || !!this.publication.isFriendshipPending;
  }

  get privacyIcon(): string {
    switch (this.publication.privacy) {
      case this.typePrivacy.PUBLIC:
        return 'public';
      case this.typePrivacy.FRIENDS:
        return 'people';
      case this.typePrivacy.PRIVATE:
        return 'lock';
      default:
        return 'public';
    }
  }

  get shouldShowLocation(): boolean {
    return this.nameGeoLocation !== '' && !this.locationLoading;
  }

}
