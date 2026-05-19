import { Component, OnInit, OnDestroy, ChangeDetectorRef, signal, ViewChild, ElementRef, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, lastValueFrom, of, Subject, takeUntil } from 'rxjs';
import { catchError, filter, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as _ from 'lodash';
import { translations } from '@translations/translations';

import { Token } from '@shared/interfaces/token.interface';
import { AuthService } from '@auth/services/auth.service';
import { AnalyticsService, ProfileStats } from '@shared/services/core-apis/analytics.service';
import { SubscriptionService } from '@shared/services/subscription.service';
import { FeatureWallService } from '@shared/services/feature-wall.service';
import { ExploreService, LocationStatus } from '@shared/services/core-apis/explore.service';
import { CreatorProfileService, CreatorProfile, CreatorStats } from '@shared/services/core-apis/creator-profile.service';
import { UserService } from '@shared/services/core-apis/users.service';
import { User } from '@shared/interfaces/user.interface';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { NotificationCommentService } from '@shared/services/notifications/notificationComment.service';
import { FriendsService } from '@shared/services/core-apis/friends.service';
import { FriendsStatus, UserData } from '@shared/interfaces/friend.interface';
import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { environment } from '@env/environment';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { ProfileService } from './services/profile.service';
import { ProfileNotificationService } from '@shared/services/notifications/profile-notification.service';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { ScrollService } from '@shared/services/scroll.service';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';
import { NotificationNewPublication } from '@shared/interfaces/notificationPublication.interface';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { PullToRefreshService } from '@shared/services/pull-to-refresh.service';
import { UtilityService } from '@shared/services/utility.service';
import { ImageLoadOptions } from '@shared/services/image.service';
import { PreloadService } from '@shared/services/preload.service';
import { MobileImageCacheService } from '@shared/services/mobile-image-cache.service';

@Component({
    selector: 'worky-profiles',
    templateUrl: './profiles.component.html',
    styleUrls: ['./profiles.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilesComponent implements OnInit, OnDestroy, AfterViewInit {
  typePublishing = TypePublishing;

  publicationsProfile = signal<PublicationView[]>([]);

  page = 1;

  pageSize = 10;

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  imageOptions: ImageLoadOptions = {
    maxRetries: 2,
    retryDelay: 1000,
    timeout: 10000,
    fallbackUrl: '/assets/images/placeholder.jpg'
  };

  paramPublication: boolean = false;

  loaderPublications: boolean = false;

  userData: User | undefined;
  isLoadingUserData: boolean = true;

  idUserProfile: string;

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  isCurrentUser: boolean = false;

  profileStats: ProfileStats | null = null;

  locationStatus: LocationStatus = { discoveryEnabled: false, city: null, country: null };
  isTogglingDiscovery = false;

  // Creator profile
  myCreatorProfile: CreatorProfile | null = null;
  myCreatorStats: CreatorStats | null = null;
  showCreatorConfig = false;
  creatorMonthlyPrice = 3000;
  creatorDescription = '';
  isSavingCreator = false;
  viewedCreatorProfile: CreatorProfile | null = null;
  isSubscribingToCreator = false;

  dataUser: Token | null = null;

  isFriend: boolean = false;

  isFriendPending: { status: boolean; _id: string } = { status: false, _id: '' };

  idPendingFriend: string = '';

  selectedFiles: File[] = [];

  imgCoverDefault = '/assets/img/shared/drag-drop-upload-add-file.webp';

  selectedImage: string | undefined;

  cropper: Cropper | undefined;

  originalMimeType: string | undefined;

  isUploading = false;

  userReceives!: UserData;

  userRequest!: UserData;

  isMobile = this._deviceDetectionService.isMobile();

  navbarVisible = true;

  hasMorePublications = true;

  private destroy$ = new Subject<void>();

  @ViewChild('contentContainer', { static: false }) contentContainer!: ElementRef;
  
  isRefreshing = false;
  isUpdatingProfile = false;

  constructor(
    public _dialog: MatDialog,
    private _authService: AuthService,
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
    private _activatedRoute: ActivatedRoute,
    private _publicationService: PublicationService,
    private _notificationCommentService: NotificationCommentService,
    private _friendsService: FriendsService,
    private _fileUploadService: FileUploadService,
    private _globalEventService: GlobalEventService,
    private _profileService: ProfileService,
    private _profileNotificationService: ProfileNotificationService,
    private _emailNotificationService: EmailNotificationService,
    private _router: Router,
    private _deviceDetectionService: DeviceDetectionService,
    private _scrollService: ScrollService,
    private _titleService: Title,
    private _configService: ConfigService,
    private _notificationPublicationService: NotificationPublicationService,
    private _logService: LogService,
    private _pullToRefreshService: PullToRefreshService,
    private _utilityService: UtilityService,
    private _preloadService: PreloadService,
    private _mobileImageCacheService: MobileImageCacheService,
    private readonly _analyticsService: AnalyticsService,
    private readonly _subscriptionService: SubscriptionService,
    private readonly _exploreService: ExploreService,
    private readonly _creatorProfileService: CreatorProfileService,
    private readonly _featureWallService: FeatureWallService,
  ) {
    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this._titleService.setTitle(configData.settings.title + ' - Profile');
    });
    this.idUserProfile = this._activatedRoute.snapshot.paramMap.get('profileId') || '';
  }

  async ngOnInit(): Promise<void> {
    if (this.idUserProfile === '') {
      this.idUserProfile = this._authService.getDecodedToken()?.id!;
      this._cdr.markForCheck();
    }

    await this.getDataProfile();

    this._profileService.validateProfile(this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe();

    // Fire-and-forget: register profile visit (self-visits are ignored by the backend)
    this._analyticsService.registerProfileVisit(this.idUserProfile).subscribe({ error: () => {} });

    // Load analytics if viewing own profile and premium
    this.isCurrentUser = this.idUserProfile === (this._authService.getDecodedToken()?.id ?? '');

    // Load discovery status for own profile
    if (this.isCurrentUser) {
      this._exploreService.getLocationStatus().pipe(takeUntil(this.destroy$)).subscribe({
        next: (status) => { this.locationStatus = status; this._cdr.markForCheck(); },
        error: () => {},
      });
    }

    if (this.isCurrentUser && this._subscriptionService.isPremiumSnapshot()) {
      this._analyticsService.getProfileStats().pipe(takeUntil(this.destroy$)).subscribe({
        next: (stats) => {
          this.profileStats = stats;
          this._cdr.markForCheck();
        },
        error: () => {},
      });
    }

    this.getUserFriend();

    this.decodedToken = this._authService.getDecodedToken()!;
    this.isCurrentUser = this.idUserProfile === this.decodedToken.id;

    this.subscribeToNotificationNewPublication();
    this.subscribeToNotificationDeletePublication();
    this.subscribeToNotificationUpdatePublication();
    this.subscribeToNotificationComment();
    this.scrollSubscription();

    this.publicationsProfile.set([]);
    await this.loadPublications();
    this.loaderPublications = false;

    this._profileNotificationService.profileUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.getDataProfile();
      this._cdr.markForCheck();
    });

    this._pullToRefreshService.refresh$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.handlePullToRefresh();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.contentContainer?.nativeElement && this.isMobile) {
        this._pullToRefreshService.initPullToRefresh(
          this.contentContainer.nativeElement
        );
        
        const container = this.contentContainer.nativeElement;
        container.style.overflowY = 'auto';
        container.style.webkitOverflowScrolling = 'touch';
        container.style.overscrollBehavior = 'contain';
      }
    }, 500);
  }

  private scrollSubscription() {
    this._scrollService.scrollEnd$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      if(data === 'scrollEnd') {
        // Add delay to prevent rapid loading
        setTimeout(() => {
          this.loadPublications();
        }, 500);
      }

      if(data === 'showNavbar') {
        this.navbarVisible = true;
        this._cdr.markForCheck();
      }
      if(data === 'hideNavbar') {
        this.navbarVisible = false;
        this._cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.contentContainer?.nativeElement) {
      this._pullToRefreshService.destroyPullToRefresh(
        this.contentContainer.nativeElement
      );
    }
  }

  private async loadPublications() {
    if (this.loaderPublications || !this.hasMorePublications) return;

    const currentPublications = this.publicationsProfile();
    if (currentPublications.length === 0) {
    } else {
      const totalExpected = this.page * this.pageSize;
      if (currentPublications.length >= totalExpected) {
        return;
      }
    }

    this.loaderPublications = true;
    try {
      const newPublications = await firstValueFrom(
        this._publicationService.forceSyncPublications(
          this.page,
          this.pageSize,
          TypePublishing.POST_PROFILE,
          this.idUserProfile
        )
      );

      const currentPublications = this.publicationsProfile();
      const newPublicationsList = newPublications.publications;

      const existingIds = new Set(currentPublications.map(pub => pub._id));

      const uniqueNewPublications = newPublicationsList.filter(
        pub => !existingIds.has(pub._id)
      );

      if (uniqueNewPublications.length > 0) {
        this.publicationsProfile.update(current => [...current, ...uniqueNewPublications]);
      }

      if (this.publicationsProfile().length >= newPublications.total) {
        this.hasMorePublications = false;
      }

      this.page++;
      this.loaderPublications = false;
      this._cdr.markForCheck();

      // Optimize preload to prevent excessive image loading
      this.preloadProfileMediaOptimized();

    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'ProfilesComponent',
        'Error al cargar las publicaciones',
        {
          user: this._authService.getDecodedToken(),
          message: error,
        },
      );
      this.loaderPublications = false;
    }
  }

  // NEW: Optimized preload method to prevent excessive image loading
  private preloadProfileMediaOptimized() {
    const currentPublications = this.publicationsProfile();
    const config = this._mobileImageCacheService.getConfig();
    
    // Only preload images for visible publications
    const visiblePublications = currentPublications.slice(-config.preloadThreshold);
    
    visiblePublications.forEach(publication => {
      if (publication.media && publication.media.length > 0) {
        // Only preload first image to reduce load
        const firstMedia = publication.media[0];
        if (firstMedia && firstMedia.url) {
          // Normalize URL before preloading
          const normalizedUrl = this._utilityService.normalizeImageUrl(firstMedia.url, environment.MINIO_BUCKET_URL || '');
          
          // Only preload if URL is absolute (http/https/blob/data)
          // Skip if URL is still relative (MINIO_BUCKET_URL may not be configured)
          const isValidUrl = normalizedUrl.startsWith('http://') ||
                             normalizedUrl.startsWith('https://') ||
                             normalizedUrl.startsWith('blob:') ||
                             normalizedUrl.startsWith('data:');
          
          if (isValidUrl) {
            this._mobileImageCacheService.loadImage(normalizedUrl, 'publication', {
              priority: 'low',
              timeout: 15000,
              publicationId: publication._id // Pass publication ID for context in logs
            } as any).subscribe({
              next: () => {
                // Image preloaded successfully - no need to log
              },
              error: (error: any) => {
                // Log 404 errors with publication context
                const errorStatus = error?.status || error?.error?.status || (error?.message?.includes('404') ? 404 : null);
                const is404 = errorStatus === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found');
                
                if (is404) {
                  this._logService.log(
                    LevelLogEnum.ERROR,
                    'ProfilesComponent',
                    'Image not found (404) during preload - Image may have been deleted from storage',
                    {
                      imageUrl: normalizedUrl,
                      originalUrl: firstMedia.url,
                      publicationId: publication._id,
                      publicationAuthor: publication.author ? `${publication.author.name} ${publication.author.lastName}` : null,
                      mediaIndex: 0,
                      mediaCount: publication.media.length,
                      timestamp: new Date().toISOString(),
                      userAgent: navigator.userAgent,
                      errorStatus: errorStatus || 'unknown',
                      errorMessage: error?.message || String(error)
                    }
                  );
                }
              }
            });
          }
        }
      }
    });
  }

  private async getDataProfile(): Promise<void> {
    if (!this.idUserProfile) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'ProfilesComponent',
        'idUserProfile is undefined or empty',
        {
          idUserProfile: this.idUserProfile,
          user: this._authService.getDecodedToken(),
        },
      );
      return;
    }

    this.isLoadingUserData = true;
    this._cdr.markForCheck();
    
    this._userService.getUserById(this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: User) => {
        this.userData = response;
        this.isLoadingUserData = false;
        this._cdr.markForCheck();
      },
      error: (error) => {
        this.isLoadingUserData = false;
        this._cdr.markForCheck();
        this._logService.log(
          LevelLogEnum.ERROR,
          'ProfilesComponent',
          'Error al obtener los datos del perfil',
          {
            user: this._authService.getDecodedToken(),
            message: error,
          },
        );
        this._router.navigate(['/']);
      },
    });
  }

  private async subscribeToNotificationNewPublication() {
    this._notificationPublicationService.notificationNewPublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((notifications: NotificationNewPublication[]) => !!notifications?.[0]?.publications?._id),
        distinctUntilChanged((prev, curr) => {
          if (!prev || !curr || prev.length === 0 || curr.length === 0) return false;
          return prev[0].publications._id === curr[0].publications._id;
        })
      )
      .subscribe({
        next: async (notifications: NotificationNewPublication[]) => {
          const notification = notifications[0];
          const publicationsCurrent = this.publicationsProfile();

          this._publicationService.syncSpecificPublication(notification.publications._id)
            .pipe(
              takeUntil(this.destroy$),
              filter((publication: PublicationView | null) => {
                return !!publication &&
                       (publication.author._id === this.idUserProfile ||
                        publication.userReceiving?._id === this.idUserProfile);
              })
            )
            .subscribe({
              next: (newPublication: PublicationView | null) => {
                if (!newPublication) return;
                
                const existingPublication = publicationsCurrent.find(pub => pub._id === newPublication._id);
                if (existingPublication) {
                  return;
                }

                const fixedPublications = publicationsCurrent.filter(pub => pub.fixed);
                const nonFixedPublications = publicationsCurrent.filter(pub => !pub.fixed);

                const updatedPublications = [
                  ...fixedPublications,
                  newPublication,
                  ...nonFixedPublications
                ];

                this.publicationsProfile.set(updatedPublications);
                this._cdr.markForCheck();
              },
              error: (error) => {
                this._logService.log(
                  LevelLogEnum.ERROR,
                  'ProfilesComponent',
                  'Error getting publication',
                  {
                    user: this._authService.getDecodedToken(),
                    message: error,
                  },
                );
              }
            });
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'ProfilesComponent',
            'Error in new publication notifications subscription',
            {
              user: this._authService.getDecodedToken(),
              message: error,
            },
          );
        }
      });
  }

  private async subscribeToNotificationDeletePublication() {
    this._notificationPublicationService.notificationDeletePublication$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => {
          if (!prev || !curr || prev.length === 0 || curr.length === 0) return false;
          return prev[0]._id === curr[0]._id;
        })
      )
      .subscribe({
        next: async (notifications: {_id: string}[]) => {
          const notification = notifications[0];
          if (notification?._id) {
            const publicationsCurrent = this.publicationsProfile();
            const index = publicationsCurrent.findIndex(pub => pub._id === notification._id);
            if (index !== -1) {
              publicationsCurrent.splice(index, 1);
              this.publicationsProfile.set(publicationsCurrent);
              this._cdr.markForCheck();
            }
          }
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'ProfilesComponent',
            'Error in delete publication notifications subscription',
            {
              user: this._authService.getDecodedToken(),
              message: error,
            },
          );
        }
      });
  }

  private async subscribeToNotificationUpdatePublication() {
    this._notificationPublicationService.notificationUpdatePublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((data: PublicationView[]) => !!data?.[0]?._id),
        debounceTime(500),
        distinctUntilChanged((prev, curr) => {
          if (!prev || !curr || prev.length === 0 || curr.length === 0) return false;
          return prev[0]._id === curr[0]._id && 
                 JSON.stringify(prev[0]) === JSON.stringify(curr[0]);
        }),
        switchMap((data: PublicationView[]) => {
          const notification = data[0];
          
          const isRelevantPublication = 
            notification.author._id === this.idUserProfile ||
            notification.userReceiving?._id === this.idUserProfile;
          
          if (!isRelevantPublication) {
            return of([]);
          }
          
          return this._publicationService.getPublicationId(notification._id).pipe(
            catchError((error) => {
              this._logService.log(
                LevelLogEnum.ERROR,
                'ProfilesComponent',
                'Error getting publication',
                {
                  user: this._authService.getDecodedToken(),
                  message: error,
                },
              );
              return of([]);
            })
          );
        }),
        filter((publication: PublicationView[]) => publication.length > 0)
      )
      .subscribe({
        next: (publication: PublicationView[]) => {
          const updatedPublication = publication[0];
          const publicationsCurrent = this.publicationsProfile();
          
          const existingIndex = publicationsCurrent.findIndex(pub => pub._id === updatedPublication._id);
          
          if (existingIndex !== -1) {
            const currentPub = publicationsCurrent[existingIndex];
            const hasChanges = JSON.stringify(currentPub) !== JSON.stringify(updatedPublication);
            
            if (hasChanges) {
              publicationsCurrent[existingIndex] = updatedPublication;
              
              const updatedPublications = this._publicationService.sortPublicationsByFixedAndDatePublic(publicationsCurrent);
              
              this.publicationsProfile.set(updatedPublications);
              this._cdr.markForCheck();
            }
          }
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'ProfilesComponent',
            'Error in update publication notifications subscription',
            {
              user: this._authService.getDecodedToken(),
              message: error,
            },
          );
        }
      });
  }

  private async subscribeToNotificationComment() {
    this._notificationCommentService.notificationComment$
     .pipe(
       takeUntil(this.destroy$),
       filter((data: any) => !!data?.postId)
     )
     .subscribe({
      next: async (data: any) => {
        if (data.postId) {
          const publicationsCurrent = this.publicationsProfile();
          
          const existingPublication = publicationsCurrent.find(pub => pub._id === data.postId);
          if (!existingPublication) {
            return;
          }
          
          this._publicationService.getPublicationId(data.postId).pipe(
            takeUntil(this.destroy$)
          ).subscribe({
            next: (publication: PublicationView[]) => {
              if (publication.length > 0) {
                const index = publicationsCurrent.findIndex(pub => pub._id === publication[0]._id);
                if (index !== -1) {
                  const currentPub = publicationsCurrent[index];
                  const hasChanges = JSON.stringify(currentPub) !== JSON.stringify(publication[0]);
                  
                  if (hasChanges) {
                    publicationsCurrent[index] = publication[0];
                    this.publicationsProfile.set(publicationsCurrent);
                    this._cdr.markForCheck();
                  }
                }
              }
            },
            error: (error) => {
              this._logService.log(
                LevelLogEnum.ERROR,
                'ProfilesComponent',
                'Error getting publication for comment',
                {
                  user: this._authService.getDecodedToken(),
                  message: error,
                },
              );
            }
          });
        }
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ProfilesComponent',
          'Error in comment notifications subscription',
          {
            user: this._authService.getDecodedToken(),
            message: error,
          },
        );
      }
    });
  }


  private getUserFriend() {
    this._userService.getUserFriends(this._authService.getDecodedToken()?.id!, this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.getUserFriendPending();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ProfilesComponent',
          'Error getting friends',
          {
            user: this._authService.getDecodedToken(),
            message: error,
          },
        );
      },
    });
  }

  private getUserFriendPending(): void {
    this._friendsService.getIsMyFriend(this._authService.getDecodedToken()?.id!, this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: FriendsStatus) => {
        this.isFriendPending.status = response?.status === 'pending';
        this.idPendingFriend = response?.id;
        if (response?.status === 'pending') {
          this.userReceives = response?.receiver;
          this.userRequest = response?.requester;
          this.isFriend = false;
          this._cdr.markForCheck();
        } else if (response?.status === 'accepted') {
          this.isFriend = true;
          this._cdr.markForCheck();
        } else if (response === null) {
          this.isFriend = false;
          this._cdr.markForCheck();
        }
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ProfilesComponent',
          'Error al obtener el estado de la solicitud de amistad',
          {
            user: this._authService.getDecodedToken(),
            message: error,
          },
        );
      },
    });
  }

  followMyFriend(_id: string) {
    if (this._configService.subscriptionModeSnapshot() && this._subscriptionService.isPremiumSnapshot() && !this._subscriptionService.hasFeature('friends')) {
      this._featureWallService.show('friends', this._subscriptionService.getPlanFeatures());
      return;
    }
    this._friendsService.requestFriend(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this.loadPublications();
        this.getUserFriendPending();
        this._emailNotificationService.sendFriendRequestNotification(_id);
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ProfilesComponent',
          'Error al enviar la solicitud de amistad',
          {
            user: this._authService.getDecodedToken(),
            message: error,
          },
        );
      }
    });
  }

  cancelFriendship(_id: string) {
    this._friendsService.deleteFriend(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this.loadPublications();
        this.getUserFriend();
        this._cdr.markForCheck();
      }
    });
  }

  async acceptFriendship(_id: string) {
    this._friendsService.acceptFriendship(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this.getUserFriendPending();
        this.loadPublications();
        this._emailNotificationService.acceptFriendRequestNotification(this.idUserProfile);
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ProfilesComponent',
          'Error al aceptar la solicitud de amistad',
          {
            user: this._authService.getDecodedToken(),
            message: error,
          },
        );
      }
    });
  }

  async openUploadModalAvatar() {
    const dialogRefAvatar = this._dialog.open(ImageUploadModalComponent, {
      data: {
        maxFiles: 1,
      }
    });

    dialogRefAvatar.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result && result.length > 0) {
        this.selectedFiles = result;
        const file = this.selectedFiles[0];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.selectedImage = e.target.result;
          this.uploadImgAvatar();
          this._cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  async uploadImgAvatar() {
    this.isUploading = true;
    this._cdr.markForCheck();

    const userId = this._authService.getDecodedToken()?.id!;
    const uploadLocation = 'profile-avatar';
    if (this.selectedImage) {
      const response = await lastValueFrom(
        this._fileUploadService.uploadFile(this.selectedFiles, uploadLocation, null, null, TypePublishing.PROFILE_IMG).pipe(takeUntil(this.destroy$))
      );

      // Handle the actual response structure: {message: string, files: Array}
      let urlImgUpload: string;
      if (response && typeof response === 'object' && response.files && Array.isArray(response.files) && response.files.length > 0) {
        const file = response.files[0];
        // Use the relative path returned by the file service (e.g., 'profile-avatar/filename.jpg')
        urlImgUpload = file.url || `${uploadLocation}/${file.filename}`;
      } else {
        this._logService.log(LevelLogEnum.ERROR, 'ProfilesComponent', 'Invalid response structure from avatar upload', { response });
        return;
      }

              this._userService.userEdit(userId, { avatar: urlImgUpload }).pipe(takeUntil(this.destroy$)).subscribe({
          next: async () => {
            // Clear old avatar from image cache to force fresh load
            if (this.userData?.avatar) {
              await this._mobileImageCacheService.clearImageFromCache(this.userData.avatar);
            }
            // Clear all profile images from cache to ensure fresh load everywhere
            await this._mobileImageCacheService.clearProfileImagesFromCache();

            // Invalidate user cache to force refresh in other components
            this._userService.invalidateUserCache(userId);

            // Update global event service with cache-busting URL
            const cacheBustUrl = urlImgUpload + '?t=' + Date.now();
            this._globalEventService.updateProfileImage(cacheBustUrl);

            // Update local user data - normalize URL
            if (this.userData) {
              this.userData.avatar = this._utilityService.normalizeImageUrl(cacheBustUrl, environment.MINIO_BUCKET_URL || '');
            }

            setTimeout(() => {
              this.isUploading = false;
              this._cdr.markForCheck();
            }, 1200);
          },
          error: (error) => {
            this._logService.log(
              LevelLogEnum.ERROR,
              'ProfilesComponent',
              'Error al actualizar la imagen de perfil',
              {
                user: this._authService.getDecodedToken(),
                message: error,
              },
            );
            this.isUploading = false;
            this._cdr.markForCheck();
          }
        });

      // No need to await Promise.all since response is not an array of promises

      this.selectedFiles = [];
      this._cdr.markForCheck();
    }
  }

  openWhatsApp() {
    window.open('https://wa.me/' + this.userData?.profile?.whatsapp?.number, '_blank');
  }

  openMessage() {
    this._router.navigate(['/messages', this.idUserProfile]);
  }

  onScroll(event: any) {
    this._scrollService.onScroll(event);
    
    if (!this.loaderPublications && this.hasMorePublications) {
      const currentPublications = this.publicationsProfile();
      if (currentPublications.length === 0) return;
      
      const container = event.target;
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;
      const scrollHeight = container.scrollHeight;
      
      const publicationHeight = 400; // Increased from 300
      const currentPublicationIndex = Math.floor(scrollTop / publicationHeight);
      const visiblePublications = Math.ceil(clientHeight / publicationHeight);
      const remainingPublications = currentPublications.length - currentPublicationIndex - visiblePublications;
      
      if (remainingPublications <= 10 && remainingPublications > 0) { // Increased from 5 to 10
        // Add delay to prevent rapid loading
        setTimeout(() => {
          this.loadPublications();
        }, 300);
      }
      
      const threshold = 500; // Increased from 200 to 500
      const position = scrollTop + clientHeight;
      if (position >= scrollHeight - threshold) {
        // Add delay to prevent rapid loading
        setTimeout(() => {
          this.loadPublications();
        }, 300);
      }
    }
  }



  private async handlePullToRefresh(): Promise<void> {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    this._cdr.markForCheck();
    
    try {
      this.showModernRefreshIndicator();
      
      await this.getDataProfile();
      
      this.page = 1;
      this.hasMorePublications = true;
      this.publicationsProfile.set([]);
      await this.loadPublications();
      
      setTimeout(() => {
        this.hideModernRefreshIndicator();
        this.isRefreshing = false;
        this._cdr.markForCheck();
      }, 1000);
      
    } catch (error) {
      // Error in pull-to-refresh - no need to log every refresh error
      this.hideModernRefreshIndicator();
      this.isRefreshing = false;
      this._cdr.markForCheck();
    }
  }

  private showModernRefreshIndicator(): void {
    let indicator = document.querySelector('.modern-refresh-indicator') as HTMLElement;
    
    if (!indicator) {
      indicator = this.createModernRefreshIndicator();
      document.body.appendChild(indicator);
    }
    
    indicator.style.opacity = '1';
    indicator.style.transform = 'translateX(-50%) translateY(20px)';
  }

  private hideModernRefreshIndicator(): void {
    const indicator = document.querySelector('.modern-refresh-indicator') as HTMLElement;
    if (indicator) {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateX(-50%) translateY(-20px)';
      
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }
  }

  private createModernRefreshIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'modern-refresh-indicator';
    indicator.innerHTML = `
      <div class="modern-refresh-container">
        <div class="modern-spinner">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" opacity="0.2"/>
            <path d="M12 4v2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 17.5V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4.93 4.93l1.77 1.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17.3 17.3l1.77 1.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12h2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M19.5 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4.93 19.07l1.77-1.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17.3 6.7l1.77-1.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="modern-refresh-text">Updating...</span>
      </div>
    `;
    
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 9999;
      pointer-events: none;
    `;
    
    const container = indicator.querySelector('.modern-refresh-container') as HTMLElement;
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: rgba(59, 130, 246, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 25px;
      box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    const spinner = indicator.querySelector('.modern-spinner') as HTMLElement;
    spinner.style.cssText = `
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: spin 1s linear infinite;
      color: white;
    `;
    
    const svg = spinner.querySelector('svg') as unknown as HTMLElement;
    svg.style.cssText = `
      width: 100%;
      height: 100%;
    `;
    
    const text = indicator.querySelector('.modern-refresh-text') as HTMLElement;
    text.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: white;
      white-space: nowrap;
      letter-spacing: 0.025em;
    `;
    
    return indicator;
  }

  onImageError(event: Event): void {
    this._utilityService.handleImageError(event, this.imgCoverDefault);
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Getters para manejar validaciones de forma elegante
  get profileCoverImage(): string {
    const coverImage = this.userData?.profile?.coverImage || '';
    if (!coverImage) return '';
    // Normalize the URL to ensure it uses MinIO bucket URL
    return this._utilityService.normalizeImageUrl(coverImage, environment.MINIO_BUCKET_URL || '');
  }

  get profileCoverImageMobile(): string {
    const coverImageMobile = this.userData?.profile?.coverImageMobile || '';
    if (!coverImageMobile) return '';
    // Normalize the URL to ensure it uses MinIO bucket URL
    return this._utilityService.normalizeImageUrl(coverImageMobile, environment.MINIO_BUCKET_URL || '');
  }

  get profileLegend(): string {
    return this.userData?.profile?.legend || '';
  }

  get profileWhatsappViewable(): boolean {
    return this.userData?.profile?.whatsapp?.isViewable === true;
  }

  onUserDataUpdated(updatedUserData: User): void {
    // Show skeleton during update
    this.isUpdatingProfile = true;
    this._cdr.markForCheck();
    
    // Small delay to ensure the skeleton is rendered before updating
    setTimeout(() => {
      // Use Object.assign for a more subtle update
      if (this.userData && updatedUserData) {
        // Update basic properties immutably - normalize avatar URL
        Object.assign(this.userData, {
          name: updatedUserData.name,
          lastName: updatedUserData.lastName,
          username: updatedUserData.username,
          avatar: updatedUserData.avatar ? this._utilityService.normalizeImageUrl(updatedUserData.avatar, environment.MINIO_BUCKET_URL || '') : updatedUserData.avatar
        });
        
        // Actualizar propiedades del perfil de forma inmutable
        if (updatedUserData.profile) {
          if (!this.userData.profile) {
            this.userData.profile = {};
          }
          Object.assign(this.userData.profile, updatedUserData.profile);
        }
      } else {
        // Fallback: reemplazar todo si no hay datos existentes
        this.userData = updatedUserData;
      }
      
      // Hide update skeleton
      this.isUpdatingProfile = false;
      this._cdr.markForCheck();
    }, 300); // Aumentado a 300ms para mejor experiencia visual
  }

  // --- Creator profile ---
  saveCreatorConfig(): void {
    if (this.isSavingCreator) return;
    this.isSavingCreator = true;
    this._creatorProfileService.upsertProfile({
      monthlyPrice: this.creatorMonthlyPrice,
      description: this.creatorDescription,
      isActive: true,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (p) => {
        this.myCreatorProfile = p;
        this.showCreatorConfig = false;
        this.isSavingCreator = false;
        this._cdr.markForCheck();
      },
      error: () => { this.isSavingCreator = false; this._cdr.markForCheck(); },
    });
  }

  deactivateCreatorPage(): void {
    this._creatorProfileService.upsertProfile({ monthlyPrice: this.creatorMonthlyPrice, isActive: false })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (p) => { this.myCreatorProfile = p; this._cdr.markForCheck(); },
      });
  }

  subscribeToCreator(): void {
    if (this.isSubscribingToCreator || !this.idUserProfile) return;
    this.isSubscribingToCreator = true;
    this._creatorProfileService.initiateSubscription(this.idUserProfile)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: ({ checkoutUrl }) => {
          this.isSubscribingToCreator = false;
          window.location.href = checkoutUrl;
        },
        error: () => { this.isSubscribingToCreator = false; this._cdr.markForCheck(); },
      });
  }

  formatCreatorPrice(price: number): string {
    return this._creatorProfileService.formatPrice(price);
  }

  toggleDiscovery(): void {
    if (this.isTogglingDiscovery) return;

    if (this.locationStatus.discoveryEnabled) {
      this.isTogglingDiscovery = true;
      this._exploreService.disableDiscovery()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (status) => {
            this.locationStatus = status;
            this.isTogglingDiscovery = false;
            this._cdr.markForCheck();
          },
          error: () => {
            this.isTogglingDiscovery = false;
            this._cdr.markForCheck();
          },
        });
      return;
    }

    if (!navigator.geolocation) {
      alert(translations['explore.geoUnavailable']);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isTogglingDiscovery = true;
        this._cdr.markForCheck();
        this._exploreService
          .updateLocation(position.coords.latitude, position.coords.longitude, true)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (status) => {
              this.locationStatus = status;
              this.isTogglingDiscovery = false;
              this._cdr.markForCheck();
            },
            error: () => {
              this.isTogglingDiscovery = false;
              this._cdr.markForCheck();
            },
          });
      },
      () => {
        alert(translations['explore.locationPermissionDenied']);
      },
    );
  }
}
