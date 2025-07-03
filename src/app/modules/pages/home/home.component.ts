import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { filter, takeUntil, debounceTime } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { NotificationCommentService } from '@shared/services/notifications/notificationComment.service';
import { AuthService } from '@auth/services/auth.service';
import { LocationService } from '@shared/services/apis/location.service';
import { GeoLocationsService } from '@shared/services/apis/apiGeoLocations.service';
import { GeocodingService } from '@shared/services/apis/geocoding.service';
import { environment } from '@env/environment';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { NetworkService } from '@shared/services/network.service';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { ScrollService } from '@shared/services/scroll.service';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';
import { NotificationNewPublication } from '@shared/interfaces/notificationPublication.interface';
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
    private _locationService: LocationService,
    private _geoLocationsService: GeoLocationsService,
    private _geocodingService: GeocodingService,
    private _activatedRoute: ActivatedRoute,
    private _notificationUsersService: NotificationUsersService,
    private _networkService: NetworkService,
    private _deviceDetectionService: DeviceDetectionService,
    private _scrollService: ScrollService,
    private _titleService: Title,
    private _configService: ConfigService,
    private _notificationPublicationService: NotificationPublicationService
  ) {
    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this._titleService.setTitle(configData.settings.title + ' - Home');
    });
    this.getLocationUser();
  }

  async ngOnInit(): Promise<void> {
    await this._authService.isAuthenticated();
    this.dataUser = this._authService.getDecodedToken();
    this._notificationUsersService.loginUser();

    this.paramPublication = await this.getParamsPublication();
    if (this.paramPublication) return;

    this.resetPagination();

    const isOnline = await firstValueFrom(this.isOnline$);
    if (isOnline) {
      await this.loadPublications();
      await this.checkForMorePublications();
    } else {
      await this.loadFromLocalCache();
    }

    this.subscribeToNotificationNewPublication();
    this.subscribeToNotificationDeletePublication();
    this.subscribeToNotificationUpdatePublication();
    this.scrollSubscription();
    this.subscribeToNotificationComment();
    
    this.observeConnectionStatus();

    setTimeout(() => {
      this._notificationUsersService.userActive();
    }, 300);

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
        console.error('Error verificando estado online', error);
      },
    });
  }

  private updateConnectionStatus(isOnline: boolean): void {
    this.showConnectionOverlay = !isOnline;
    this.connectionStatusMessage = isOnline ? '' : 'Estás offline - Usando cache local';
    
    if (!isOnline && this.publications().length === 0) {
      this.loadFromLocalCache();
    }
  }

  private scrollSubscription() {
    this._scrollService.scrollEnd$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      if(data === 'scrollEnd') {
        this.loadPublications();
      }
      if(data === 'showScrollToTopButton') this.showScrollToTopButton = true;
      if(data === 'hideScrollToTopButton') this.showScrollToTopButton = false;
    });
  }

  public async loadPublications() {
    
    if (this.loaderPublications || !this.hasMorePublications) {
      return;
    }

    this.loaderPublications = true;
    
    try {
      const newPublicationsResponse = await firstValueFrom(
        this._publicationService.getAllPublicationsSmart(this.page, this.pageSize, TypePublishing.ALL)
      );

      const currentPublications = this.publications();
      const newPublicationsList = newPublicationsResponse.publications;

      if (this.page === 1) {
        this.publications.set(newPublicationsList);
      } else {
        const existingIds = new Set(currentPublications.map(pub => pub._id));
        const uniqueNewPublications = newPublicationsList.filter(
          pub => !existingIds.has(pub._id)
        );

        if (uniqueNewPublications.length > 0) {
          this.publications.update(current => [...current, ...uniqueNewPublications]);
        }
      }

      if (newPublicationsList.length === 0) {
        this.hasMorePublications = false;
      } else if (newPublicationsResponse.total && this.publications().length >= newPublicationsResponse.total) {
        this.hasMorePublications = false;
      } else if (newPublicationsList.length < this.pageSize) {
        this.hasMorePublications = false;
      } else {
        this.hasMorePublications = true;
      }

      this.page++;
      this.loaderPublications = false;
      this._cdr.markForCheck();

      await this.checkForMorePublications();

    } catch (error) {
      this.loaderPublications = false;
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
          
          this._publicationService.syncSpecificPublication(notification.publications._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (newPublication) => {
                if (newPublication) {
                  const publicationsCurrent = this.publications();
                  
                  const existingIndex = publicationsCurrent.findIndex(pub => pub._id === newPublication._id);
                  
                  if (existingIndex === -1) {
                    const fixedPublications = publicationsCurrent.filter(pub => pub.fixed);
                    const nonFixedPublications = publicationsCurrent.filter(pub => !pub.fixed);
                    
                    const updatedPublications = [
                      ...fixedPublications,
                      newPublication,
                      ...nonFixedPublications
                    ];
                    
                    this.publications.set(updatedPublications);
                    this._cdr.markForCheck();
                  }
                }
              },
              error: (error) => {
                console.error('Error al sincronizar nueva publicación:', error);
              }
            });
        },
        error: (error) => {
          console.error('Error en la suscripción de notificaciones de nuevas publicaciones:', error);
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
          console.error('Error en la suscripción de notificaciones de eliminar publicaciones:', error);
        }
      });
  }

  private async subscribeToNotificationUpdatePublication() {
    this._notificationPublicationService.notificationUpdatePublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((data: PublicationView[]) => !!data?.[0]?._id),
        debounceTime(500)
      )
      .subscribe({
        next: (data: PublicationView[]) => {
          const notification = data[0];
          
          this._publicationService.syncSpecificPublication(notification._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (updatedPublication) => {
                if (updatedPublication) {
                  const publicationsCurrent = this.publications();
                  const index = publicationsCurrent.findIndex(pub => pub._id === updatedPublication._id);
                  
                  if (index !== -1) {
                    const currentPub = publicationsCurrent[index];
                    const hasChanges = JSON.stringify(currentPub) !== JSON.stringify(updatedPublication);
                    
                    if (hasChanges) {
                      publicationsCurrent[index] = updatedPublication;
                      
                      const fixedPublications = publicationsCurrent.filter(pub => pub.fixed);
                      const nonFixedPublications = publicationsCurrent.filter(pub => !pub.fixed);
                      
                      const updatedPublications = [
                        ...fixedPublications,
                        ...nonFixedPublications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      ];
                      
                      this.publications.set(updatedPublications);
                      this._cdr.markForCheck();
                    }
                  }
                }
              },
              error: (error) => {
                console.error('Error al sincronizar publicación actualizada:', error);
              }
            });
        },
        error: (error) => {
          console.error('Error en la suscripción de notificaciones de actualizar publicaciones:', error);
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
        console.error('Error en la suscripción de notificaciones de comentarios:', error);
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
        console.error('Error al obtener la publicación:', error);
        result = false;
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

  private resetPagination() {
    this.page = 1;
    this.hasMorePublications = true;
  }

  async forceRefreshPublications() {
    console.log('Forzando actualización de publicaciones...');
    
    this.loaderPublications = true;
    this.resetPagination();
    
    try {
      const freshPublicationsResponse = await firstValueFrom(
        this._publicationService.forceSyncPublications(this.page, this.pageSize, TypePublishing.ALL)
      );

      this.publications.set(freshPublicationsResponse.publications);
      
      if (freshPublicationsResponse.publications.length === 0 || 
          freshPublicationsResponse.publications.length >= freshPublicationsResponse.total) {
        this.hasMorePublications = false;
      } else {
        this.hasMorePublications = true;
      }
      
      this.page = 2;
      this.loaderPublications = false;
      this._cdr.markForCheck();
      
    } catch (error) {
      console.error('Error al forzar actualización:', error);
      this.loaderPublications = false;
    }
  }

  async loadFromLocalCache() {
    
    this.loaderPublications = true;
    this.page = 1;
    this.hasMorePublications = true;
    
    try {
      const localPublicationsResponse = await firstValueFrom(
        this._publicationService.getOnlyLocalPublications(this.page, this.pageSize)
      );

      this.publications.set(localPublicationsResponse.publications);
      
      this.page = 2;
      this.loaderPublications = false;
      this._cdr.markForCheck();
      
    } catch (error) {
      console.error('Error al cargar desde cache local:', error);
      this.loaderPublications = false;
    }
  }

  async manualRefreshPublications() {
    console.log('Sincronización manual iniciada...');
    
    this.loaderPublications = true;
    
    try {
      const currentPublications = this.publications();
      const publicationIds = currentPublications.map(pub => pub._id);
      
      const updatedPublications = await firstValueFrom(
        this._publicationService.syncSpecificPublications(publicationIds)
      );
      
      if (updatedPublications.length > 0) {
        console.log(`${updatedPublications.length} publicaciones actualizadas`);
        
        const updatedMap = new Map(updatedPublications.map(pub => [pub._id, pub]));
        
        const refreshedPublications = currentPublications.map(pub => 
          updatedMap.get(pub._id) || pub
        );
        
        this.publications.set(refreshedPublications);
        this._cdr.markForCheck();
      } else {
        console.log('No hay publicaciones para actualizar');
      }
      
      this.loaderPublications = false;
      
    } catch (error) {
      console.error('Error en sincronización manual:', error);
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

  public checkIfMorePublicationsAvailable(): void {
    if (this.publications().length === 0) {
      this.hasMorePublications = true;
      return;
    }

    if (!this.hasMorePublications) {
      return;
    }

    this._publicationService.getCountPublications().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (totalCount) => {
        const currentCount = this.publications().length;
        this.hasMorePublications = currentCount < totalCount;
      },
      error: (error) => {
        console.error('Error verificando total de publicaciones:', error);
        this.hasMorePublications = true;
      }
    });
  }

  private async checkForMorePublications(): Promise<void> {
    try {
      const totalCount = await firstValueFrom(
        this._publicationService.getCountPublications()
      );
      
      const currentCount = this.publications().length;
      const hasMore = currentCount < totalCount;
            
      if (this.hasMorePublications !== hasMore) {
        this.hasMorePublications = hasMore;
        this._cdr.markForCheck();
      }
    } catch (error) {
      console.error('Error verificando total de publicaciones:', error);
    }
  }
}
