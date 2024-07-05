import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { Meta } from '@angular/platform-browser';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { PublicationService } from '@shared/services/publication.service';
import { NotificationCommentService } from '@shared/services/notifications/notificationComment.service';
import { AuthService } from '@auth/services/auth.service';
import { AlertService } from '@shared/services/alert.service';
import { LocationService } from '@shared/services/apis/location.service';
import { GeoLocationsService } from '@shared/services/apis/apiGeoLocations.service';
import { GeocodingService } from '@shared/services/apis/geocoding.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@env/environment';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { NetworkService } from '@shared/services/network.service';

@Component({
  selector: 'worky-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  typePublishing = TypePublishing;
  publications: PublicationView[] = [];
  page = 1;
  pageSize = 5; // Cambia esto para probar con 5 publicaciones por página
  loaderPublications: boolean = false;
  paramPublication: boolean = false;
  hasMorePublications: boolean = true;
  urlMediaApi = environment.APIFILESERVICE;
  dataUser = this._authService.getDecodedToken();
  isOnline$ = this._networkService.connectionStatus;
  connectionSpeed$ = this._networkService.connectionSpeed;

  showConnectionOverlay = false;
  connectionStatusMessage = '';

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
    private _networkService: NetworkService
  ) {
    this.getLocationUser();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async ngOnInit() {
    this.isOnline$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (isOnline) => {
        if (!isOnline) {
          this.showConnectionOverlay = true;
          this.connectionStatusMessage = 'You are offline';
        } else {
          this.showConnectionOverlay = false;
        }
      },
      error: (error) => {
        console.error('Error getting connection status', error);
      }
    });

    this.connectionSpeed$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (speed) => {
        if (speed === 'slow') {
          this.showConnectionOverlay = true;
          this.connectionStatusMessage = 'Your connection is slow';
        } else {
          this.showConnectionOverlay = false;
        }
      },
      error: (error) => {
        console.error('Error getting connection speed', error);
      }
    });

    this._notificationUsersService.loginUser();
    this.paramPublication = await this.getParamsPublication();
    if (this.paramPublication) return;

    await this.loadPublications();
    this._cdr.markForCheck();

    this.loadSubscription();
    this.subscribeToNotificationComment();
  }

  private loadSubscription() {
    this._publicationService.publications$.pipe(
      distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (publicationsData: PublicationView[]) => {
        this.updatePublications(publicationsData);
      },
      error: (error) => {
        console.error('Error getting publications', error);
      }
    });

    this._publicationService.publicationsDeleted$.pipe(
      distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (publicationsData: PublicationView[]) => {
        this.publications = this.publications.filter(pub => !publicationsData.some(pubDeleted => pubDeleted._id === pub._id));
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting publications', error);
      }
    });
  }

  async loadPublications() {
    if (this.loaderPublications || !this.hasMorePublications) return;
    this.loaderPublications = true;
    try {
      const newPublications = await firstValueFrom(this._publicationService.getAllPublications(this.page, this.pageSize));
      const uniqueNewPublications = newPublications.filter(newPub => 
        !this.publications.some(pub => pub._id === newPub._id)
      );

      if (uniqueNewPublications.length > 0) {
        this.publications = [...this.publications, ...uniqueNewPublications];
        this.page++;
        this._cdr.markForCheck();
      } else {
        this.hasMorePublications = false;
      }
      this.loaderPublications = false;
    } catch (error) {
      console.error('Error loading publications', error);
      this.loaderPublications = false;
    }
    this._cdr.markForCheck();
  }

  onScroll(event: any) {
    const scrollTop = event.target.scrollTop;
    const scrollHeight = event.target.scrollHeight;
    const offsetHeight = event.target.offsetHeight;
    const threshold = 100;

    if (scrollTop + offsetHeight + threshold >= scrollHeight && !this.loaderPublications && this.hasMorePublications) {
      this.loadPublications();
    }
  }

  async subscribeToNotificationComment() {
    this._notificationCommentService.notificationComment$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(async (data: any) => {
      const newCommentInPublications = await firstValueFrom(this._publicationService.getAllPublications(this.page, this.pageSize));
      this._publicationService.updatePublications(newCommentInPublications);
      this._cdr.markForCheck();
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

          // section meta tags
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
        console.error('Error get publications', error);
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
    let shouldUpdate = false;
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
          this._cdr.markForCheck();
          shouldUpdate = true;
        }
      } else {
        this.publications.push(newPub);
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) {
      this.publications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      this.publications.forEach(pub => {
        if (pub.comment) {
          pub.comment.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      });

      this._cdr.markForCheck();
    }
  }

  trackByFn(index: number, item: PublicationView) {
    return item._id; 
  }
}
