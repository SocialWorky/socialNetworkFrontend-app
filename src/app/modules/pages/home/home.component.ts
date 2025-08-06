import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { filter, takeUntil, debounceTime, distinctUntilChanged, throttleTime, map } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { PublicationDataService } from '@shared/services/core-apis/publication-data.service';
import { PublicationCacheService } from '@shared/services/core-apis/publication-cache.service';
import { NetworkOptimizationService } from '@shared/services/network-optimization.service';
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
import { PullToRefreshService } from '@shared/services/pull-to-refresh.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { ImagePreloadService } from '@shared/services/image-preload.service';

@Component({
    selector: 'worky-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
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

  navbarVisible = true;

  private destroy$ = new Subject<void>();
  private scrollThrottle = new Subject<{ scrollTop: number; clientHeight: number; scrollHeight: number }>();

  @ViewChild('contentContainer', { static: false }) contentContainer!: ElementRef;
  
  isRefreshing = false;

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  trackById(index: number, publication: PublicationView): string {
    return publication._id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Computed properties for template optimization
  get shouldShowAddPublication(): boolean {
    return !this.paramPublication;
  }

  get shouldShowLoader(): boolean {
    return this.loaderPublications;
  }

  get shouldShowEmptyState(): boolean {
    return !this.loaderPublications && this.publications().length === 0;
  }

  get shouldShowConnectionOverlay(): boolean {
    return this.showConnectionOverlay;
  }

  get publicationsCount(): number {
    return this.publications().length;
  }

  get isLastPublication(): (index: number) => boolean {
    return (index: number) => index === this.publicationsCount - 1;
  }

  constructor(
    private _publicationService: PublicationService,
    private _publicationDataService: PublicationDataService,
    private _publicationCacheService: PublicationCacheService,
    private _networkOptimizationService: NetworkOptimizationService,
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
    private _notificationPublicationService: NotificationPublicationService,
    private _pullToRefreshService: PullToRefreshService,
    private _logService: LogService,
    private _imagePreloadService: ImagePreloadService
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

    await this.loadPublications();
    await this.checkForMorePublications();

    this.subscribeToNotificationNewPublication();
    this.subscribeToNotificationDeletePublication();
    this.subscribeToNotificationUpdatePublication();
    this.setupOptimizedScroll();
    this.subscribeToNotificationComment();
    
    this.observeConnectionStatus();

    setTimeout(() => {
      this._notificationUsersService.userActive();
    }, 300);

    // Suscribirse al evento de pull-to-refresh
    this._pullToRefreshService.refresh$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.handlePullToRefresh();
    });
  }

  ngAfterViewInit(): void {
    // Initialize pull-to-refresh after view is ready
    setTimeout(() => {
      if (this.contentContainer?.nativeElement) {
        this._pullToRefreshService.initPullToRefresh(
          this.contentContainer.nativeElement
        );
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Limpiar pull-to-refresh
    if (this.contentContainer?.nativeElement) {
      this._pullToRefreshService.destroyPullToRefresh(
        this.contentContainer.nativeElement
      );
    }
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
    
    if (this.publications().length === 0) {
      this.loadPublications();
    }
  }

  private setupOptimizedScroll() {
    // Setup optimized scroll handling with throttling
    this.scrollThrottle.pipe(
      throttleTime(100), // 100ms throttling for better performance
      distinctUntilChanged((prev, curr) => {
        // Only trigger if scroll position changed significantly
        return Math.abs(prev.scrollTop - curr.scrollTop) < 50;
      }),
      takeUntil(this.destroy$)
    ).subscribe((scrollData) => {
      this.handleScrollOptimized(scrollData);
    });

    // Keep original scroll service for navbar visibility
    this._scrollService.scrollEnd$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      if(data === 'scrollEnd') {
        this.loadPublications();
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

  private handleScrollOptimized(scrollData: { scrollTop: number; clientHeight: number; scrollHeight: number }) {
    if (!this.loaderPublications && this.hasMorePublications) {
      const currentPublications = this.publications();
      if (currentPublications.length === 0) return;
      
      const { scrollTop, clientHeight, scrollHeight } = scrollData;
      
      // Optimized calculation for infinite scroll
      const publicationHeight = 300;
      const currentPublicationIndex = Math.floor(scrollTop / publicationHeight);
      const visiblePublications = Math.ceil(clientHeight / publicationHeight);
      const remainingPublications = currentPublications.length - currentPublicationIndex - visiblePublications;
      
      // Load more publications when approaching the end
      if (remainingPublications <= 5 && remainingPublications > 0) {
        this.loadPublications();
      }
      
      // Alternative threshold-based loading
      const threshold = 200;
      const position = scrollTop + clientHeight;
      if (position >= scrollHeight - threshold) {
        this.loadPublications();
      }
    }
  }

  public async loadPublications() {
    if (this.loaderPublications || !this.hasMorePublications) {
      return;
    }

    const currentPublications = this.publications();
    if (currentPublications.length === 0) {
    } else {
      const totalExpected = this.page * this.pageSize;
      if (currentPublications.length >= totalExpected) {
        return;
      }
    }

    this.loaderPublications = true;
    
    try {
      // Check cache first using PublicationCacheService
      const cacheKey = `publications_${this.page}_${this.pageSize}_${TypePublishing.ALL}`;
      const cachedPublications = this._publicationCacheService.getPublicationListFromCache(cacheKey);
      
      let newPublicationsResponse;
      
      if (cachedPublications) {
        // Use cached data
        newPublicationsResponse = {
          publications: cachedPublications,
          total: cachedPublications.length
        };
        this._logService.log(LevelLogEnum.INFO, 'HomeComponent', 'Publications loaded from cache', {
          page: this.page,
          count: cachedPublications.length
        });
      } else {
        // Load from server using PublicationDataService
        newPublicationsResponse = await firstValueFrom(
          this._publicationDataService.getAllPublicationsFromServer(this.page, this.pageSize, TypePublishing.ALL)
        );
        
        // Cache the response
        if (newPublicationsResponse.publications.length > 0) {
          this._publicationCacheService.addPublicationListToCache(cacheKey, newPublicationsResponse.publications);
        }
      }

      const currentPublications = this.publications();
      const newPublicationsList = newPublicationsResponse.publications;

      if (this.page === 1) {
        this.publications.set(newPublicationsList);
      } else {
        const existingIds = new Set(currentPublications.map(pub => pub._id));
        const uniqueNewPublications = newPublicationsList.filter(
          (pub: PublicationView) => !existingIds.has(pub._id)
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

      this.preloadPublicationsMedia();
      await this.checkForMorePublications();

    } catch (error) {
      this._logService.log(LevelLogEnum.ERROR, 'HomeComponent', 'Error loading publications', { error });
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
                console.error('Error syncing new publication:', error);
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
        // Removed debounceTime for immediate response
        distinctUntilChanged((prev, curr) => {
          if (!prev || !curr || prev.length === 0 || curr.length === 0) return false;
          return prev[0]._id === curr[0]._id && 
                 JSON.stringify(prev[0]) === JSON.stringify(curr[0]);
        })
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
                      
                      // Use the service method to sort publications correctly
                      const updatedPublications = this._publicationService.sortPublicationsByFixedAndDatePublic(publicationsCurrent);
                      
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



  private resetPagination() {
    this.page = 1;
    this.hasMorePublications = true;
  }

  async forceRefreshPublications() {
    // Force refresh publications initiated - no need to log every refresh
    
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
    // Manual refresh publications initiated - no need to log every refresh
    
    this.loaderPublications = true;
    
    try {
      const currentPublications = this.publications();
      const publicationIds = currentPublications.map(pub => pub._id);
      
      const updatedPublications = await firstValueFrom(
        this._publicationService.syncSpecificPublications(publicationIds)
      );
      
      if (updatedPublications.length > 0) {
        // Publications updated successfully - no need to log every update
        
        const updatedMap = new Map(updatedPublications.map(pub => [pub._id, pub]));
        
        const refreshedPublications = currentPublications.map(pub => 
          updatedMap.get(pub._id) || pub
        );
        
        this.publications.set(refreshedPublications);
        this._cdr.markForCheck();
      } else {
        // No publications to update - no need to log every check
      }
      
      this.loaderPublications = false;
      
    } catch (error) {
      console.error('Error en sincronización manual:', error);
      this.loaderPublications = false;
    }
  }

  onScroll(event: any) {
    this._scrollService.onScroll(event);
    
    // Send scroll data to throttled stream for optimized processing
    const container = event.target;
    this.scrollThrottle.next({
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight,
      scrollHeight: container.scrollHeight
    });
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
        console.error('Error checking total publications:', error);
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
      console.error('Error checking total publications:', error);
    }
  }

  private preloadPublicationsMedia(): void {
    const publications = this.publications();
    if (publications.length === 0) return;

    // Preload images for the most recent publications
    const recentPublications = publications.slice(0, 5); // Preload first 5 publications
    recentPublications.forEach(publication => {
      this._imagePreloadService.preloadPublicationImages(publication);
    });

    // Also preload profile images
    this._imagePreloadService.preloadImages({
      profileImages: true,
      publicationImages: false,
      mediaImages: false,
      priority: 'medium',
      maxImages: 10
    });
  }

  private async handlePullToRefresh(): Promise<void> {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    this._cdr.markForCheck();
    
    try {
      // Mostrar indicador de refresh moderno
      this.showModernRefreshIndicator();
      
      // Force publications update
      await this.forceRefreshPublications();
      
      // Hide indicator after completion
      setTimeout(() => {
        this.hideModernRefreshIndicator();
        this.isRefreshing = false;
        this._cdr.markForCheck();
      }, 1000);
      
    } catch (error) {
      console.error('Error en pull-to-refresh:', error);
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
        <span class="modern-refresh-text">Actualizando...</span>
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
}

