import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common'
import { Title } from '@angular/platform-browser';
import { filter, map, Subject, switchMap, takeUntil } from 'rxjs';
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
import { PwaUpdateService } from '@shared/services/pwa-update.service';
import { EmojiEventsService } from '@shared/services/emoji-events.service';
import { WidgetConfigService } from '@shared/modules/worky-widget/service/widget-config.service';
import { environment } from '@env/environment';
import { DevCacheService } from '@shared/services/dev-cache.service';
import { CacheService } from '@shared/services/cache.service';

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
    private _pwaUpdateService: PwaUpdateService,
    private _emojiEventsService: EmojiEventsService,
    private _widgetConfigService: WidgetConfigService,
    private devCacheService: DevCacheService,
    private cacheService: CacheService
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

    //TODO: Wait a little before subscribing to events, this is to give time for components to start before subscribing
    setTimeout(() => {
      this._socketService.listenEvent('newExternalMessage', (message: any) => {
        if (!message.idReference) return;
        
        switch (message.type) {
          case TypePublishing.POST:
            this.handlePostUpdate(message.idReference);
            break;
          case TypePublishing.COMMENT:
            this.handleCommentUpdate(message.idReference);
            break;
          case TypePublishing.EMOJI:
            this._emojiEventsService.notifyEmojiProcessed(message);
            break;
          default:
            break;
        }
      });
    }, 1000);

    setTimeout(() => {
      this._loadingService.setLoading(false);
      document.getElementById('loading-screen')?.remove();
    }, 4000);

    if(localStorage.getItem('token')) this.currentUserId = this._authService.getDecodedToken()!.id;

    // Verify PWA updates securely
    this._pwaUpdateService.checkForUpdates().catch(() => {
      // Silent error if updates cannot be verified
    });

    if (!environment.PRODUCTION) {
      // Solo en desarrollo
      this.setupDevMode();
    }

    // Setup accessibility fix for Ionic overlays
    this.setupAccessibilityFix();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this._pwaUpdateService.destroy();
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

  // Test method for PWA update simulation (development only)
  /*
  testPwaUpdate(): void {
    this._pwaUpdateService.simulateUpdate();
  }
  */

  private setupDevMode(): void {
    // Generar datos mock para desarrollo
    this.devCacheService.generateMockData();
    
    // Log de operaciones de caché
    this.devCacheService.logCacheOperation('init', 'app-startup');
  }

  private cleanInvalidTokens(): void {
    const token = localStorage.getItem('token');
    if (token === 'undefined' || token === 'null' || !token) {
      localStorage.removeItem('token');
      localStorage.removeItem('lastLogin');
      sessionStorage.clear();
    }
  }
}
