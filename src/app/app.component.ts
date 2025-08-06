import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common'
import { Title } from '@angular/platform-browser';
import { filter, map, Subject, switchMap, takeUntil, timer, of, catchError, retryWhen, delay, tap } from 'rxjs';
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
    private _appUpdateManagerService: AppUpdateManagerService
  ) {
    this._notificationUsersService.setupInactivityListeners();
    if (Capacitor.isNativePlatform()) this._pushNotificationService.initPush();
  }

  async ngOnInit(): Promise<void> {
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
            this.handlePostUpdate(message.idReference);
            if (this.isMediaProcessingNotification(message)) {
              this.handleMediaProcessingNotification(message.idReference);
            } else if (message.containsMedia) {
              this._mediaEventsService.notifyMediaProcessed(message);
            }
            break;
          case TypePublishing.COMMENT:
            this.handleCommentUpdate(message.idReference);
            if (message.containsMedia) {
              this._mediaEventsService.notifyMediaProcessed(message);
            }
            break;
          case TypePublishing.EMOJI:
            this._emojiEventsService.notifyEmojiProcessed(message);
            break;
          default:
            if (this.isMediaProcessingNotification(message)) {
              this.handleMediaProcessingNotification(message.idReference);
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

  private handlePostUpdate(publicationId: string): void {
    this._publicationService.getPublicationId(publicationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((publication: PublicationView[]) => {
        this._socketService.emitEvent('updatePublication', publication);
      });
  }

  private handleCommentUpdate(commentId: string): void {
    this._commentService.getCommentsById(commentId)
      .pipe(
        takeUntil(this.destroy$),
        filter(Boolean),
        switchMap((comment: any) =>
          this._publicationService.getPublicationId(comment.publicationId)
            .pipe(map((publication: PublicationView[]) => ({ comment, publication })))
        )
      )
      .subscribe(({ publication }) => {
        this._socketService.emitEvent('updatePublication', publication);
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
    const link: HTMLLinkElement =
      document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = logoUrl;
    document.getElementsByTagName('head')[0].appendChild(link);
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
    return message.title && message.title.includes('Archivo procesado');
  }

  /**
   * Handle media processing notification with RxJS operators for better control flow
   */
  private handleMediaProcessingNotification(publicationId: string): void {
    if (!publicationId) {
      return;
    }

    // Create a polling mechanism with RxJS operators
    timer(2000) // Initial delay of 2 seconds
      .pipe(
        switchMap(() => this._publicationService.getPublicationId(publicationId)),
        switchMap((publications: PublicationView[]) => {
          if (publications && publications.length > 0) {
            const publication = publications[0];
            
            if (publication.media && publication.media.length > 0) {
              // Media found, notify and complete
              this._mediaEventsService.notifyMediaProcessed({
                idReference: publicationId,
                media: publication.media,
                containsMedia: true
              });
              return of(null); // Complete the stream
            } else {
              // No media found, try force sync
              return this._publicationService.syncSpecificPublication(publicationId)
                .pipe(
                  switchMap((syncedPublication) => {
                    if (syncedPublication && syncedPublication.media && syncedPublication.media.length > 0) {
                      this._mediaEventsService.notifyMediaProcessed({
                        idReference: publicationId,
                        media: syncedPublication.media,
                        containsMedia: true
                      });
                      return of(null); // Complete the stream
                    } else {
                      // Still no media, retry after 2 more seconds
                      return timer(2000).pipe(
                        switchMap(() => this._publicationService.getPublicationId(publicationId)),
                        map((retryPublications: PublicationView[]) => {
                          if (retryPublications && retryPublications.length > 0) {
                            const retryPublication = retryPublications[0];
                            
                            if (retryPublication.media && retryPublication.media.length > 0) {
                              this._mediaEventsService.notifyMediaProcessed({
                                idReference: publicationId,
                                media: retryPublication.media,
                                containsMedia: true
                              });
                            } else {
                              this._mediaEventsService.notifyMediaProcessed({
                                idReference: publicationId,
                                media: [],
                                containsMedia: false
                              });
                            }
                          } else {
                            this._mediaEventsService.notifyMediaProcessed({
                              idReference: publicationId,
                              media: [],
                              containsMedia: false
                            });
                          }
                          return null;
                        }),
                        catchError(() => {
                          this._mediaEventsService.notifyMediaProcessed({
                            idReference: publicationId,
                            media: [],
                            containsMedia: false
                          });
                          return of(null);
                        })
                      );
                    }
                  }),
                  catchError(() => {
                    this._mediaEventsService.notifyMediaProcessed({
                      idReference: publicationId,
                      media: [],
                      containsMedia: false
                    });
                    return of(null);
                  })
                );
            }
          } else {
            // No publication found, notify to clear processing state
            this._mediaEventsService.notifyMediaProcessed({
              idReference: publicationId,
              media: [],
              containsMedia: false
            });
            return of(null);
          }
        }),
        catchError(() => {
          // Even if error, notify to clear processing state
          this._mediaEventsService.notifyMediaProcessed({
            idReference: publicationId,
            media: [],
            containsMedia: false
          });
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
}
