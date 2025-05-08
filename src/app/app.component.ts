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
  ) {
    this._notificationUsersService.setupInactivityListeners();
    if (Capacitor.isNativePlatform()) this._pushNotificationService.initPush();
  }

  ngOnInit(): void {
    this.document.body.classList.add('light-theme');
    this._renderer.setAttribute(
      this.document.documentElement,
      'lang',
      getTranslationsLanguage()
    );
    this.applyCustomConfig();
    setTimeout(() => {
      this._loadingService.setLoading(false);
      document.getElementById('loading-screen')?.remove();
    }, 4000);
    this._socketService.connectToWebSocket();

    this._socketService.listenEvent('newExternalMessage', (message: any) => {
      if (!message.idReference) return;
      switch (message.type) {
        case TypePublishing.POST:
          this.handlePostUpdate(message.idReference);
          break;
        case TypePublishing.COMMENT:
          this.handleCommentUpdate(message.idReference);
          break;
        default:
          console.warn('Tipo de mensaje no soportado:', message.type);
      }
    });

    if(localStorage.getItem('token')) this.currentUserId = this._authService.getDecodedToken()!.id;

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
}
