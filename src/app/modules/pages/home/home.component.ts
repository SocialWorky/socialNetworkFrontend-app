import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { Title } from '@angular/platform-browser';

import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { PublicationService } from '@shared/services/publication.service';
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
import { ConfigService } from '@shared/services/config.service';
import { AxiomService } from '@shared/services/apis/axiom.service';
import { AxiomType } from '@shared/interfaces/axiom.enum';

@Component({
  selector: 'worky-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  typePublishing = TypePublishing;
  
  publications: PublicationView[] = [];
  
  page = 1;
  
  pageSize = 1;
  
  loaderPublications: boolean = false;
  
  paramPublication: boolean = false;
  
  hasMorePublications: boolean = true;
  
  urlMediaApi = environment.APIFILESERVICE;
  
  dataUser = this._authService.getDecodedToken();
  
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
    private _axiomService: AxiomService
  ) {

    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this._titleService.setTitle(configData.settings.title + ' - Home');
    });
    this.getLocationUser();
  }

  async ngOnInit(): Promise<void> {
    this.observeConnectionStatus();
    this.observeConnectionSpeed();
    this._notificationUsersService.loginUser();

    this.paramPublication = await this.getParamsPublication();
    if (this.paramPublication) return;

    if (!navigator.onLine) {
      this.handleOfflineStatus();
      return;
    }

    await this.loadPublications();

    this.loadSubscription();
    this.scrollSubscription();
    this.subscribeToNotificationComment();

    setTimeout(() => {
      this._notificationUsersService.userActive();
    }, 300);

    this._cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private observeConnectionStatus(): void {
    this.isOnline$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (isOnline) => {
        this.updateConnectionStatus(isOnline);
      },
      error: (error) => {
        this.logError('Error verificando estado online', error);
      },
    });
  }

  private updateConnectionStatus(isOnline: boolean): void {
    this.showConnectionOverlay = !isOnline;
    this.connectionStatusMessage = isOnline ? '' : 'You are offline';
  }

  private observeConnectionSpeed(): void {
    this.connectionSpeed$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (speed) => {
        if (speed === 'slow') {
          this.handleSlowConnection();
        }
      },
      error: (error) => {
        this.logError('Error verificando velocidad de conexión', error);
      },
    });
  }

  private handleSlowConnection(): void {
    this._alertService.showAlert(
      'Su conexión a internet es lenta',
      'puede experimentar problemas de carga',
      Alerts.WARNING,
      Position.CENTER,
      true,
      true,
      'Aceptar'
    );
    this._axiomService.sendLog({
      message: 'Conexión lenta del usuario',
      component: 'HomeComponent',
      type: AxiomType.INFO,
      info: this.dataUser,
    });
  }

  private handleOfflineStatus(): void {
    this.showConnectionOverlay = true;
    this.connectionStatusMessage = 'You are offline';
  }

  private logError(message: string, error: any): void {
    this._axiomService.sendLog({
      message,
      component: 'HomeComponent',
      type: AxiomType.ERROR,
      error,
    });
  }

  private scrollSubscription() {
    this._scrollService.scrollEnd$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      if(data === 'scrollEnd') this.loadPublications();
      if(data === 'showScrollToTopButton') this.showScrollToTopButton = true;
      if(data === 'hideScrollToTopButton') this.showScrollToTopButton = false;
    });
  }

  private async loadSubscription() {
    this._publicationService.publications$.pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (publicationsData: PublicationView[]) => {
        this.updatePublications(publicationsData);
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._axiomService.sendLog({ 
          message: 'Error en suscripción de publicaciones',
          component: 'HomeComponent',
          type: AxiomType.ERROR,
          error: error 
        });
      }
    });

    this._publicationService.publicationsDeleted$.pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (publicationsData: PublicationView[]) => {
        this.publications = this.publications.filter(pub => !publicationsData.some(pubDeleted => pubDeleted._id === pub._id));
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._axiomService.sendLog({ 
          message: 'Error en suscripción de eliminar publicación',
          component: 'HomeComponent',
          type: AxiomType.ERROR,
          error: error
        });
      }
    });
  }

 async loadPublications() {
    if (this.loaderPublications || !this.hasMorePublications || !navigator.onLine) return;
    this.loaderPublications = true;
    try {
      const newPublications = await firstValueFrom(this._publicationService.getAllPublications(this.page, this.pageSize, TypePublishing.ALL));
      if (newPublications.total === this.publications.length) {
        this.hasMorePublications = false;
      }

      const uniqueNewPublications = newPublications.publications.filter(newPub => 
        !this.publications.some(pub => pub._id === newPub._id)
      );

      this.publications = [...this.publications, ...uniqueNewPublications];
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

  async subscribeToNotificationComment() {
    this._notificationCommentService.notificationComment$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(async (data: any) => {
      const newCommentInPublications = await firstValueFrom(this._publicationService.getAllPublications(this.page, this.pageSize));
      this._publicationService.updatePublications(newCommentInPublications.publications);
      this._cdr.markForCheck();
    }, (error) => {
      this._axiomService.sendLog({
        message: 'Error en suscripción de notificaciones de comentarios',
        component: 'HomeComponent',
        type: AxiomType.ERROR,
        error: error
      });
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
          this.publications = publication;

          this._meta.updateTag({ property: 'og:title', content: 'worky Social Network' });
          this._meta.updateTag({ property: 'og:description', content: this.publications[0]?.content });
          this._meta.updateTag({ property: 'og:image', content: this.urlMediaApi + this.publications[0]?.media[0]?.url });
          this._meta.addTag({ name: 'robots', content: 'index, follow' });

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

  private updatePublications(publicationsData: PublicationView[]) {
    publicationsData.forEach(newPub => {
      const index = this.publications.findIndex(pub => pub._id === newPub._id);
      if (index !== -1) {
        const existingPub = this.publications[index];
        if (
          JSON.stringify(existingPub) !== JSON.stringify(newPub) ||
          JSON.stringify(existingPub.comment) !== JSON.stringify(newPub.comment) ||
          JSON.stringify(existingPub.reaction) !== JSON.stringify(newPub.reaction)
        ) {
          this.publications[index] = newPub;
        }
      } else {
        this.publications.push(newPub);
      }
    });

    this.publications.sort((a, b) => {
      if (a.fixed && !b.fixed) return -1;
      if (!a.fixed && b.fixed) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    this.publications.forEach(pub => {
      if (pub.comment) {
        pub.comment.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    });

    this._cdr.markForCheck();
  }

  scrollToTop() {
    this._scrollService.scrollToTop();
  }
}
