import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, firstValueFrom, of, Observable, fromEvent } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { Title } from '@angular/platform-browser';

import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { NotificationCommentService } from '@shared/services/notifications/notificationComment.service';
import { AuthService } from '@auth/services/auth.service';
import { AlertService } from '@shared/services/alert.service';
import { LocationService } from '@shared/services/apis/location.service';
import { GeoLocationsService } from '@shared/services/apis/apiGeoLocations.service';
import { GeocodingService } from '@shared/services/apis/geocoding.service';
import { environment } from '@env/environment';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { NetworkService } from '@shared/services/network.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { ScrollService } from '@shared/services/scroll.service';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { AxiomService } from '@shared/services/apis/axiom.service';
import { AxiomType } from '@shared/interfaces/axiom.enum';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';
import { NotificationNewPublication, NotificationUpdatePublication } from '@shared/interfaces/notificationPublication.interface';
import { Token } from '@shared/interfaces/token.interface';

@Component({
    selector: 'worky-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {
  typePublishing = TypePublishing;

  publications = signal<PublicationView[]>([]);

  page = 1;

  pageSize = 10;

  loaderPublications: boolean = false;

  paramPublication: boolean = false;

  hasMorePublications: boolean = true;

  urlMediaApi = environment.APIFILESERVICE;

  dataUser: Token | null = null;

  isOnline$ = this._networkService.connectionStatus;

  connectionSpeed$ = this._networkService.connectionSpeed;

  showConnectionOverlay = false;

  connectionStatusMessage = '';

  showScrollToTopButton = false;

  private destroy$ = new Subject<void>();

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  trackById(index: number, publication: PublicationView): string {
    return publication._id;
  }

  constructor(
    private _publicationService: PublicationService,
    private _cdr: ChangeDetectorRef,
    private _notificationCommentService: NotificationCommentService,
    private _authService: AuthService,
    private _alertService: AlertService,
    private _locationService: LocationService,
    private _geoLocationsService: GeoLocationsService,
    private _geocodingService: GeocodingService,
    private _activatedRoute: ActivatedRoute,
    private _meta: Meta,
    private _notificationUsersService: NotificationUsersService,
    private _networkService: NetworkService,
    private _deviceDetectionService: DeviceDetectionService,
    private _scrollService: ScrollService,
    private _titleService: Title,
    private _configService: ConfigService,
    private _axiomService: AxiomService,
    private _notificationPublicationService: NotificationPublicationService
  ) {
    this._authService.isAuthenticated();
    this.dataUser = this._authService.getDecodedToken();
    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this._titleService.setTitle(configData.settings.title + ' - Home');
    });
    this.getLocationUser();
  }

  async ngOnInit(): Promise<void> {
    this._notificationUsersService.loginUser();

    this.paramPublication = await this.getParamsPublication();
    if (this.paramPublication) return;

    await this.loadPublications();

    this.subscribeToNotificationNewPublication();
    this.subscribeToNotificationDeletePublication();
    this.subscribeToNotificationUpdatePublication();
    this.scrollSubscription();
    this.subscribeToNotificationComment();

    setTimeout(() => {
      this._notificationUsersService.userActive();
    }, 300);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // private observeConnectionStatus(): void {
  //   this.isOnline$.pipe(takeUntil(this.destroy$)).subscribe({
  //     next: (isOnline) => {
  //       this.updateConnectionStatus(isOnline);
  //     },
  //     error: (error) => {
  //       this.logError('Error verificando estado online', error);
  //     },
  //   });
  // }

  // private updateConnectionStatus(isOnline: boolean): void {
  //   this.showConnectionOverlay = !isOnline;
  //   this.connectionStatusMessage = isOnline ? '' : 'You are offline';
  // }

  // private observeConnectionSpeed(): void {
  //   this.connectionSpeed$.pipe(takeUntil(this.destroy$)).subscribe({
  //     next: (speed) => {
  //       if (speed === 'slow') {
  //         this.handleSlowConnection();
  //       }
  //     },
  //     error: (error) => {
  //       this.logError('Error verificando velocidad de conexión', error);
  //     },
  //   });
  // }

  // private handleSlowConnection(): void {
  //   this._alertService.showAlert(
  //     'Su conexión a internet es lenta',
  //     'puede experimentar problemas de carga',
  //     Alerts.WARNING,
  //     Position.CENTER,
  //     true,
  //     true,
  //     'Aceptar'
  //   );
  //   this._axiomService.sendLog({
  //     message: 'Conexión lenta del usuario',
  //     component: 'HomeComponent',
  //     type: AxiomType.INFO,
  //     info: this.dataUser,
  //   });
  // }

  // private handleOfflineStatus(): void {
  //   this.showConnectionOverlay = true;
  //   this.connectionStatusMessage = 'You are offline';
  // }

  // private logError(message: string, error: any): void {
  //   this._axiomService.sendLog({
  //     message,
  //     component: 'HomeComponent',
  //     type: AxiomType.ERROR,
  //     error,
  //   });
  // }

  private scrollSubscription() {
    this._scrollService.scrollEnd$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      if(data === 'scrollEnd') this.loadPublications();
      if(data === 'showScrollToTopButton') this.showScrollToTopButton = true;
      if(data === 'hideScrollToTopButton') this.showScrollToTopButton = false;
    });
  }

  private async loadPublications() {
    if (this.loaderPublications || !this.hasMorePublications) return;

    this.loaderPublications = true;
    try {
      const newPublications = await firstValueFrom(this._publicationService.getAllPublications(this.page, this.pageSize, TypePublishing.ALL));

      this.publications.update((current: PublicationView[]) => [...current, ...newPublications.publications]);

      if (this.publications().length >= newPublications.total) {
        this.hasMorePublications = false;
      }

      this.page++;
      this.loaderPublications = false;
      this._cdr.markForCheck();


    } catch (error) {
      this._axiomService.sendLog({
        message: 'Error en cargar publicaciones',
        component: 'HomeComponent',
        type: AxiomType.ERROR,
        error: error
      });
      this.loaderPublications = false;
    }
  }

  onScroll(event: any) {
    const threshold = 100;
    const position = event.target.scrollTop + event.target.clientHeight;
    const height = event.target.scrollHeight;

    this.showScrollToTopButton = position > 3500;

    if (position >= height - threshold && !this.loaderPublications && this.hasMorePublications) {
      this.loadPublications();
    }
  }

  private async subscribeToNotificationNewPublication() {
    this._notificationPublicationService.notificationNewPublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((notifications: NotificationNewPublication[]) => !!notifications?.[0]?.publications?._id)
      )
      .subscribe({
        next: async (notifications: NotificationNewPublication[]) => {
          const notification = notifications[0];
          const publicationsCurrent = this.publications();

          this._publicationService.getPublicationId(notification.publications._id)
            .pipe(
              takeUntil(this.destroy$),
              filter((publication: PublicationView[]) => !!publication && publication.length > 0)
            )
            .subscribe({
              next: (publication: PublicationView[]) => {
                if (!publication.length) return;
                const newPublication = publication[0];

                const fixedPublications = publicationsCurrent.filter(pub => pub.fixed);
                const nonFixedPublications = publicationsCurrent.filter(pub => !pub.fixed);

                const updatedPublications = [
                  ...fixedPublications,
                  newPublication,
                  ...nonFixedPublications
                ];

                this.publications.set(updatedPublications);
                this._cdr.markForCheck();
              },
              error: (error) => {
                this._axiomService.sendLog({
                  message: 'Error al obtener nueva publicación',
                  component: 'HomeComponent',
                  type: AxiomType.ERROR,
                  error: error
                });
              }
            });
        },
        error: (error) => {
          this._axiomService.sendLog({
            message: 'Error en suscripción de notificaciones de nuevas publicaciones',
            component: 'HomeComponent',
            type: AxiomType.ERROR,
            error: error
          });
        }
      });
  }

  private async subscribeToNotificationDeletePublication() {
    this._notificationPublicationService.notificationDeletePublication$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (notifications: {_id: string}[]) => {
          const notification = notifications[0];
          if (notification?._id) {
            const publicationsCurrent = this.publications();
            const index = publicationsCurrent.findIndex(pub => pub._id === notification._id);
            if (index !== -1) {
              publicationsCurrent.splice(index, 1);
              this.publications.set(publicationsCurrent);
              this._cdr.markForCheck();
            }
          }
        },
        error: (error) => {
          this._axiomService.sendLog({
            message: 'Error en suscripción de notificaciones de eliminar publicaciones',
            component: 'HomeComponent',
            type: AxiomType.ERROR,
            error: error
          });
        }
      });
  }

  private async subscribeToNotificationUpdatePublication() {
    this._notificationPublicationService.notificationUpdatePublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((data: PublicationView[]) => !!data?.[0]?._id),
        switchMap((data: PublicationView[]) => {
          const notification = data[0];
          return this._publicationService.getPublicationId(notification._id).pipe(
            catchError((error) => {
              this._axiomService.sendLog({
                message: 'Error al obtener publicación actualizada',
                component: 'HomeComponent',
                type: AxiomType.ERROR,
                error: error,
              });
              return of([]);
            })
          );
        }),
        filter((publication: PublicationView[]) => publication.length > 0)
      )
      .subscribe({
        next: (publication: PublicationView[]) => {
          const updatedPublication = publication[0];
          const publicationsCurrent = this.publications();

          const fixedPublications = publicationsCurrent.filter(pub => pub.fixed && pub._id !== updatedPublication._id);
          const nonFixedPublications = publicationsCurrent.filter(pub => !pub.fixed && pub._id !== updatedPublication._id);

          let updatedPublications: PublicationView[];

          if (updatedPublication.fixed) {
            updatedPublications = [
              updatedPublication,
              ...fixedPublications,
              ...nonFixedPublications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            ];
          } else {
            updatedPublications = [
              ...fixedPublications,
              ...nonFixedPublications.concat(updatedPublication).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            ];
          }

          this.publications.set(updatedPublications);
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._axiomService.sendLog({
            message: 'Error en suscripción de notificaciones de actualizar publicaciones',
            component: 'HomeComponent',
            type: AxiomType.ERROR,
            error: error,
          });
        }
      });
  }

  private async subscribeToNotificationComment() {
    this._notificationCommentService.notificationComment$
     .pipe(takeUntil(this.destroy$))
     .subscribe({
      next: async (data: any) => {
        if (data.postId) {
          const publicationsCurrent = this.publications();
          this._publicationService.getPublicationId(data.postId).pipe(takeUntil(this.destroy$)).subscribe({
            next: (publication: PublicationView[]) => {
              const index = publicationsCurrent.findIndex(pub => pub._id === publication[0]._id);
              if (index !== -1) {
                publicationsCurrent[index] = publication[0];
                this.publications.set(publicationsCurrent);
                this._cdr.markForCheck();
              }
            },
          });
        }
      },
      error: (error) => {
        this._axiomService.sendLog({
          message: 'Error en suscripción de notificaciones de comentarios',
          component: 'HomeComponent',
          type: AxiomType.ERROR,
          error: error
        });
      }
    });
  }

  private async getParamsPublication(): Promise<boolean> {
    let result = false;
    const _idPublication = this._activatedRoute.snapshot.paramMap.get('_idPublication');
    if (_idPublication) {
      try {
        const publication = await firstValueFrom(this._publicationService.getPublicationId(_idPublication));
        if (publication.length) {
          this.loaderPublications = false;
          this.publications.set(publication);
          // this._meta.updateTag({ property: 'og:title', content: 'worky Social Network' });
          // this._meta.updateTag({ property: 'og:description', content: this.publications.get()[0]?.description });
          // this._meta.updateTag({ property: 'og:image', content: this.urlMediaApi + this.publications.get()[0]?.media[0]?.url });
          // this._meta.addTag({ name: 'robots', content: 'index, follow' });

          this._cdr.markForCheck();
          result = true;
        } else {
          result = false;
        }
      } catch (error) {
        this._axiomService.sendLog({
          message:'Error al cargar publicación por id',
          component: 'HomeComponent',
          type: AxiomType.ERROR,
          error: error
        });
      }
    }
    return result;
  }

  private async getLocationUser() {
    const [latitude, longitude] = await this._locationService.getUserLocation();
    if (!latitude && !longitude) return;

    const result = await firstValueFrom(this._geoLocationsService.findLocationByLatAndLng(latitude, longitude));
    if (result) return;

    const data = await firstValueFrom(this._geocodingService.getGeocodeLatAndLng(latitude, longitude));
    if (data.results && data.results.length > 0) {
      await firstValueFrom(this._geoLocationsService.createLocations(data));
    }
  }

  scrollToTop() {
    this._scrollService.scrollToTop();
  }
}
