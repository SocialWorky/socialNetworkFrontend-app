import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit, Renderer2, Injector } from '@angular/core';
import { DOCUMENT } from '@angular/common'
import { Title } from '@angular/platform-browser';
import { filter, map, Subject, switchMap, takeUntil, timer, of, catchError, retryWhen, delay, tap, take, groupBy, mergeMap, debounceTime, retry } from 'rxjs';
import { Capacitor } from '@capacitor/core';

import { getTranslationsLanguage } from '../translations/translations';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { LoadingService } from '@shared/services/loading.service';
import { SocketService } from '@shared/services/socket.service';
import { PushNotificationService } from '@shared/services/notifications/push-notification.service';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { CommentService } from '@shared/services/core-apis/comment.service';
import { AuthService } from '@auth/services/auth.service';

import { EmojiEventsService } from '@shared/services/emoji-events.service';
import { MediaEventsService } from '@shared/services/media-events.service';
import { WidgetConfigService } from '@shared/modules/worky-widget/service/widget-config.service';
import { environment } from '@env/environment';
import { DevCacheService } from '@shared/services/dev-cache.service';
import { CacheService } from '@shared/services/cache.service';
import { CacheOptimizationService } from '@shared/services/cache-optimization.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { AppUpdateManagerService } from '@shared/services/app-update-manager.service';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';
import { ImageOrganizer, MediaType } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';
import { UtilityService } from '@shared/services/utility.service';

@Component({
    selector: 'worky-root',
    templateUrl: 'app.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {

  deferredPrompt: any;

  showInstallPrompt = false;

  currentUserId: string = '';

  environment = environment;

  private destroy$ = new Subject<void>();
  private mediaReadyNotification$ = new Subject<any>();
  private mediaCollector = new Map<string, any[]>();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _renderer: Renderer2,
    private _configService: ConfigService,
    private _titleService: Title,
    private _notificationUsersService: NotificationUsersService,
    private _loadingService: LoadingService,
    private _socketService: SocketService,
    private _pushNotificationService: PushNotificationService,
    private _publicationService: PublicationService,
    private _commentService: CommentService,
    private _authService: AuthService,

    private _emojiEventsService: EmojiEventsService,
    private _mediaEventsService: MediaEventsService,
    private _widgetConfigService: WidgetConfigService,
    private devCacheService: DevCacheService,
    private cacheService: CacheService,
    private _cacheOptimizationService: CacheOptimizationService,
    private _logService: LogService,
    private _appUpdateManagerService: AppUpdateManagerService,
    private _notificationPublicationService: NotificationPublicationService,
    private _utilityService: UtilityService
  ) {
    this._notificationUsersService.setupInactivityListeners();
    if (Capacitor.isNativePlatform()) this._pushNotificationService.initPush();
  }

  async ngOnInit(): Promise<void> {
    this.setupMediaReadyDebouncer();
    // Clear invalid tokens first
    this.cleanInvalidTokens();
    
    const token = localStorage.getItem('token');
    
    if (token && token !== 'undefined' && token !== 'null') {
      this._socketService.updateToken(token);
    } else {
      this._socketService.connectToWebSocket();
    }

    this.document.body.classList.add('light-theme');
    this._renderer.setAttribute(
      this.document.documentElement,
      'lang',
      getTranslationsLanguage()
    );
    this.applyCustomConfig();

    // Only initialize widget data if user is authenticated
    await this.checkAuthenticationAndInitializeWidgets();

    // Initialize app update checks
    this.initializeAppUpdates();

    setTimeout(() => {
      this._socketService.listenEvent('newExternalMessage', (message: any) => {
        if (!message.idReference) {
          return;
        }
        switch (message.type) {
          case TypePublishing.POST:
            if (this.isMediaProcessingNotification(message)) {
              // Collect media data from the socket message
              const pubId = message.idReference;
              if (!this.mediaCollector.has(pubId)) {
                this.mediaCollector.set(pubId, []);
              }
              // The 'data' field contains the info for one processed file
              if (message.data) {
                this.mediaCollector.get(pubId)!.push(message);
              }

              // Push the full message to the debouncer to act as a trigger
              this.mediaReadyNotification$.next(message);
            } else {
              this.handlePostUpdate(message.idReference);
              if (message.containsMedia) {
                this._mediaEventsService.notifyMediaProcessed(message);
              }
            }
            break;
          case TypePublishing.COMMENT:
            if (this.isMediaProcessingNotification(message)) {
              // Collect media data from the socket message for comments
              // For comments, idReference is the comment ID, but we need to track by comment ID
              const commentId = message.idReference;
              if (!this.mediaCollector.has(commentId)) {
                this.mediaCollector.set(commentId, []);
              }
              // The 'data' field contains the info for one processed file
              if (message.data) {
                this.mediaCollector.get(commentId)!.push(message);
              }
              // Push the full message to the debouncer to act as a trigger
              this.mediaReadyNotification$.next(message);
            } else {
              this.handleCommentUpdate(message.idReference);
              if (message.containsMedia) {
                this._mediaEventsService.notifyMediaProcessed(message);
              }
            }
            break;
          case TypePublishing.EMOJI:
            this._emojiEventsService.notifyEmojiProcessed(message);
            break;
          default:
            if (this.isMediaProcessingNotification(message)) {
              // Same logic for other types if needed in the future
              const pubId = message.idReference;
              if (!this.mediaCollector.has(pubId)) {
                this.mediaCollector.set(pubId, []);
              }
              if (message.data) {
                this.mediaCollector.get(pubId)!.push(message);
              }
              this.mediaReadyNotification$.next(message);
            }
            break;
        }
      });
    }, 500);

    setTimeout(() => {
      this._loadingService.setLoading(false);
      document.getElementById('loading-screen')?.remove();
    }, 2000);

    if(localStorage.getItem('token')) this.currentUserId = this._authService.getDecodedToken()!.id;

    // Verify PWA updates securely


    if (!environment.PRODUCTION) {
      this.setupDevMode();
    }

    // Initialize mobile performance optimizations
    this.initializeMobileOptimizations();

    // Setup accessibility fix for Ionic overlays
    this.setupAccessibilityFix();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

  }

  private setupAccessibilityFix(): void {
    // Create a MutationObserver to watch for aria-hidden changes on the root element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target as HTMLElement;
          if (target.getAttribute('aria-hidden') === 'true') {
            // Check if there are any focused elements within the root
            const focusedElement = this.document.activeElement;
            if (focusedElement && target.contains(focusedElement)) {
              // If there's a focused element inside, remove aria-hidden to prevent accessibility issues
              this._renderer.removeAttribute(target, 'aria-hidden');
            }
          }
        }
      });
    });

    // Start observing the root element
    const rootElement = this.document.querySelector('worky-root');
    if (rootElement) {
      observer.observe(rootElement, {
        attributes: true,
        attributeFilter: ['aria-hidden']
      });
    }

    // Clean up observer on destroy
    this.destroy$.subscribe(() => {
      observer.disconnect();
    });
  }

  private setupMediaReadyDebouncer(): void {
    this.mediaReadyNotification$.pipe(
      groupBy(message => message.idReference),
      mergeMap(group$ => group$.pipe(debounceTime(2500))), // Wait for 2.5s of silence for a given ID
      takeUntil(this.destroy$)
    ).subscribe(lastMessage => {
      // Check if it's a comment or publication based on the type
      if (lastMessage.type === TypePublishing.COMMENT) {
        this.buildCommentWithCollectedMedia(lastMessage.idReference);
      } else {
        this.buildPublicationWithCollectedMedia(lastMessage.idReference);
      }
    });
  }

  private handlePostUpdate(publicationId: string): void {
    this._publicationService.getPublicationId(publicationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((publication: PublicationView[]) => {
        this._socketService.emitEvent('updatePublication', publication);
      });
  }

  private handleCommentUpdate(commentId: string): void {
    // Delay to ensure database has completed media linking
    // Increased delay to ensure media is fully processed and linked
    timer(1000).pipe(
      takeUntil(this.destroy$),
      switchMap(() => this._commentService.getCommentsById(commentId)),
      filter(Boolean),
      switchMap((comment: any) => {
        if (!comment.publicationId) {
          // Comment might be on a media item, not directly on a publication
          return of(null);
        }
        // Force refresh by bypassing cache (second parameter = true)
        return this._publicationService.getPublicationId(comment.publicationId, true);
      }),
      filter((publication): publication is PublicationView[] => !!publication && publication.length > 0),
      // Retry if media is still processing (up to 2 retries with 1 second delay)
      retry({
        count: 2,
        delay: 1000
      })
    ).subscribe({
      next: (publication) => {
        // Use updatePublications which handles both socket notification and local database
        // This will trigger the update in publication-view component
        this._publicationService.updatePublications(publication);
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'AppComponent',
          'Error updating comment after media processing',
          { commentId, error: error instanceof Error ? error.message : String(error) }
        );
      }
    });
  }

  /**
   * Builds the final publication object by fetching the base and injecting all collected media.
   */
  private buildPublicationWithCollectedMedia(publicationId: string): void {
    const collectedMessages = this.mediaCollector.get(publicationId);

    if (!collectedMessages || collectedMessages.length === 0) {
      return;
    }

    // Fetch the base publication to get latest comments, reactions, etc., bypassing cache.
    this._publicationService.getPublicationId(publicationId, true).pipe(
      take(1),
      catchError(err => {
        this._logService.log(LevelLogEnum.ERROR, 'AppComponent', `Failed to fetch base publication ${publicationId}`, { error: err });
        return of(null); // Return null to handle the error gracefully
      })
    ).subscribe(publications => {
      if (publications && publications.length > 0) {
        const basePublication = publications[0];

        // Manually construct the full media array from all collected messages
        const constructedMedia: ImageOrganizer[] = collectedMessages.map(msg => {
          // Normalize URLs for MinIO
          // The msg.data object contains the result from uploadService.processFile
          // which includes url, urlThumbnail, urlCompressed as relative MinIO paths
          const baseUrl = environment.MINIO_BUCKET_URL || '';
          
          // Use the MinIO URLs directly from the data object
          // These are already relative paths like "publications/filename.jpg" or "publications/compressed|filename.jpg"
          const getFullPath = (relativePath: string) => {
            if (!relativePath) return '';
            // If already a full URL, return as is
            if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
              return relativePath;
            }
            // Normalize the relative path with the base URL
            return this._utilityService.normalizeImageUrl(relativePath, baseUrl);
          };
          
          // Prefer urlCompressed/urlThumbnail from data, fallback to constructing from filename/thumbnail if needed
          const url = msg.data.url ? getFullPath(msg.data.url) : '';
          const urlThumbnail = msg.data.urlThumbnail ? getFullPath(msg.data.urlThumbnail) : 
            (msg.data.thumbnail ? getFullPath(`${msg.urlMedia || 'publications/'}${msg.data.thumbnail}`) : '');
          const urlCompressed = msg.data.urlCompressed ? getFullPath(msg.data.urlCompressed) :
            (msg.data.compressed ? getFullPath(`${msg.urlMedia || 'publications/'}${msg.data.compressed}`) : url);
          
          return {
            _id: '', // Not critical for the view
            url: url,
            urlThumbnail: urlThumbnail,
            urlCompressed: urlCompressed || url, // Fallback to url if urlCompressed is not available
            comments: [],
            type: MediaType.IMAGE // This can be enhanced to detect video/image from file extension
          };
        });

        // Merge and update view
        basePublication.media = constructedMedia;
        basePublication.containsMedia = false; // The media is now present
        
        this.updatePublicationView(basePublication);
      }

      // Clean up collector for this publication ID
      this.mediaCollector.delete(publicationId);
    });
  }

  /**
   * Builds the final comment object by fetching the comment and publication, then injecting all collected media.
   */
  private buildCommentWithCollectedMedia(commentId: string): void {
    const collectedMessages = this.mediaCollector.get(commentId);

    if (!collectedMessages || collectedMessages.length === 0) {
      return;
    }

    // First, get the comment to find its publicationId
    this._commentService.getCommentsById(commentId).pipe(
      take(1),
      filter(Boolean),
      switchMap((comment: any) => {
        if (!comment.publicationId) {
          // Comment might be on a media item, not directly on a publication
          this._logService.log(LevelLogEnum.WARN, 'AppComponent', `Comment ${commentId} has no publicationId`, {});
          return of(null);
        }
        // Get the publication with the comment
        return this._publicationService.getPublicationId(comment.publicationId, true).pipe(
          map((publications: PublicationView[]) => {
            if (!publications || publications.length === 0) {
              return null;
            }
            return { publication: publications[0], comment };
          })
        );
      }),
      catchError(err => {
        this._logService.log(LevelLogEnum.ERROR, 'AppComponent', `Failed to fetch comment and publication for ${commentId}`, { error: err });
        return of(null);
      })
    ).subscribe(result => {
      if (!result) {
        // Clean up collector even if we couldn't process
        this.mediaCollector.delete(commentId);
        return;
      }

      const { publication, comment } = result;

      // Manually construct the full media array from all collected messages
      const constructedMedia: ImageOrganizer[] = collectedMessages.map(msg => {
        // Normalize URLs for MinIO
        // The msg.data object contains the result from uploadService.processFile
        // which includes url, urlThumbnail, urlCompressed as relative MinIO paths
        const baseUrl = environment.MINIO_BUCKET_URL || '';
        
        // Use the MinIO URLs directly from the data object
        // These are already relative paths like "comments/filename.jpg" or "comments/compressed|filename.jpg"
        const getFullPath = (relativePath: string) => {
          if (!relativePath) return '';
          // If already a full URL, return as is
          if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            return relativePath;
          }
          // Normalize the relative path with the base URL
          return this._utilityService.normalizeImageUrl(relativePath, baseUrl);
        };
        
        // Prefer urlCompressed/urlThumbnail from data, fallback to constructing from filename/thumbnail if needed
        const url = msg.data.url ? getFullPath(msg.data.url) : '';
        const urlThumbnail = msg.data.urlThumbnail ? getFullPath(msg.data.urlThumbnail) : 
          (msg.data.thumbnail ? getFullPath(`${msg.urlMedia || 'comments/'}${msg.data.thumbnail}`) : '');
        const urlCompressed = msg.data.urlCompressed ? getFullPath(msg.data.urlCompressed) :
          (msg.data.compressed ? getFullPath(`${msg.urlMedia || 'comments/'}${msg.data.compressed}`) : url);
        
        return {
          _id: '', // Not critical for the view
          url: url,
          urlThumbnail: urlThumbnail,
          urlCompressed: urlCompressed || url, // Fallback to url if urlCompressed is not available
          comments: [],
          type: MediaType.IMAGE // This can be enhanced to detect video/image from file extension
        };
      });

      // Find the comment in the publication and update it with the media
      const commentIndex = publication.comment?.findIndex((c: any) => c._id === commentId);
      if (commentIndex !== undefined && commentIndex >= 0) {
        // Update the comment with the constructed media
        publication.comment[commentIndex].media = constructedMedia;
        publication.comment[commentIndex].containsMedia = false; // The media is now present
        
        // Update the publication with the updated comment
        this._publicationService.updatePublications([publication]);
      } else {
        this._logService.log(LevelLogEnum.WARN, 'AppComponent', `Comment ${commentId} not found in publication ${publication._id}`, {});
      }

      // Clean up collector for this comment ID
      this.mediaCollector.delete(commentId);
    });
  }

  applyCustomConfig() {
    this._configService.config$.pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      if (configData) {
        this.applyConfig(configData);
      }
    });

    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this.applyConfig(configData);
    });
  }

  applyConfig(configData: any) {
    if (!configData || !configData.settings) {
      return;
    }

    if (configData.customCss) {
      const styleElement = this._renderer.createElement('style');
      styleElement.id = 'custom-css';
      styleElement.innerHTML = String(configData.customCss);
      this._renderer.appendChild(this.document.head, styleElement);
    }

    const title = configData.settings.title || 'Social Network App';
    this._titleService.setTitle(title);

    const logoUrl = configData.settings.logoUrl || 'assets/img/navbar/worky-your-logo.png';
    this.updateFavicon(logoUrl);
  }

  updateFavicon(logoUrl: string) {
    if (!logoUrl) {
      return;
    }

    // Normalize the URL - handle MinIO relative paths
    let normalizedUrl = logoUrl;
    
    // If it's a relative MinIO path, normalize it
    if (logoUrl && !logoUrl.startsWith('http://') && !logoUrl.startsWith('https://') && !logoUrl.startsWith('data:') && !logoUrl.startsWith('blob:') && !logoUrl.startsWith('assets/')) {
      // It's likely a MinIO path, normalize it
      normalizedUrl = this._utilityService.normalizeImageUrl(logoUrl, environment.MINIO_BUCKET_URL || '');
    }

    // Detect image type from URL extension
    const getImageType = (url: string): string => {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'image/jpeg';
      if (lowerUrl.includes('.png')) return 'image/png';
      if (lowerUrl.includes('.svg')) return 'image/svg+xml';
      if (lowerUrl.includes('.gif')) return 'image/gif';
      if (lowerUrl.includes('.webp')) return 'image/webp';
      if (lowerUrl.includes('.ico')) return 'image/x-icon';
      // Default to PNG if cannot determine
      return 'image/png';
    };

    // Find and remove all existing favicon links (including shortcut icon, apple-touch-icon, etc.)
    const existingLinks = document.querySelectorAll("link[rel*='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
    existingLinks.forEach(link => link.remove());

    // Add timestamp to force browser refresh
    const timestamp = new Date().getTime();
    const separator = normalizedUrl.includes('?') ? '&' : '?';
    const faviconUrl = normalizedUrl + separator + 'v=' + timestamp;
    const imageType = getImageType(normalizedUrl);

    // Create standard favicon
    const faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = imageType;
    faviconLink.href = faviconUrl;
    document.head.appendChild(faviconLink);

    // Also create shortcut icon for better browser compatibility
    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.type = imageType;
    shortcutLink.href = faviconUrl;
    document.head.appendChild(shortcutLink);

    // Create apple-touch-icon for iOS devices
    const appleTouchLink = document.createElement('link');
    appleTouchLink.rel = 'apple-touch-icon';
    appleTouchLink.href = faviconUrl;
    document.head.appendChild(appleTouchLink);
    
    this._logService.log(
      LevelLogEnum.INFO,
      'AppComponent',
      'Favicon updated',
      { originalUrl: logoUrl, normalizedUrl: faviconUrl, imageType }
    );
  }

  private async checkAuthenticationAndInitializeWidgets(): Promise<void> {
    try {
      const isAuthenticated = await this._authService.isAuthenticated();
      if (isAuthenticated) {
        this._widgetConfigService.initializeData();
      }
    } catch (error) {
      // User is not authenticated, widgets won't be initialized
      // This is expected behavior for non-authenticated users
    }
  }



  private setupDevMode(): void {
    // Generar datos mock para desarrollo
    this.devCacheService.generateMockData();
    
    // Cache operations log disabled to avoid spam
  }

  private cleanInvalidTokens(): void {
    const token = localStorage.getItem('token');
    if (token === 'undefined' || token === 'null' || !token) {
      localStorage.removeItem('token');
      localStorage.removeItem('lastLogin');
      sessionStorage.clear();
    }
  }

  private initializeMobileOptimizations(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Mobile device detected, applying performance optimizations - no need to log every detection
      
      // Reduce initial load time by delaying non-critical services
      setTimeout(() => {
        this._cacheOptimizationService.forcePreload();
      }, 5000);
    }
  }

  private initializeAppUpdates(): void {
    // App update manager is automatically initialized in its constructor
    // This method can be used for additional app update initialization if needed
  }

  /**
   * Check if the message is a media processing notification
   */
  private isMediaProcessingNotification(message: any): boolean {
    const title = message.title?.toLowerCase() || '';
    const isProcessing = title.includes('archivo procesado') || title.includes('file processed') || title.includes('files processed');
    return isProcessing;
  }

  /**
   * Update publication view with new data from backend
   */
  private updatePublicationView(publication: PublicationView): void {
    // Notify MediaEventsService for PublicationViewComponent to update individual publication
    this._mediaEventsService.notifyMediaProcessed({
      idReference: publication._id,
      media: publication.media,
      containsMedia: true
    });

    // Notify NotificationPublicationService to update publication in lists (HomeComponent, etc)
    this._notificationPublicationService.sendNotificationUpdatePublication([publication]);
  }
}
