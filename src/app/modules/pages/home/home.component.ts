import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, firstValueFrom, lastValueFrom } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { Meta } from '@angular/platform-browser';

import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { PublicationService } from '@shared/services/publication.service';
import { NotificationCommentService } from '@shared/services/notifications/notificationComment.service';
import { AuthService } from '@auth/services/auth.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { LocationService } from '@shared/services/apis/location.service';
import { GeoLocationsService } from '@shared/services/apis/apiGeoLocations.service';
import { GeocodingService } from '@shared/services/apis/geocoding.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@env/environment';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';

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

  pageSize = 10;

  loaderPublications?: boolean = false;

  paramPublication: boolean = false;

  urlMediaApi = environment.APIFILESERVICE;

  dataUser = this._authService.getDecodedToken();

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
  ) {
    this.getLocationUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async ngOnInit() {
    this._notificationUsersService.loginUser();
    this.paramPublication = await this.getParamsPublication();
    if (this.paramPublication) return;

    await this.loadPublications();

    this._publicationService.publications$.pipe(
      // distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: async (publicationsData: PublicationView[]) => {
        this.updatePublications(publicationsData);
      },
      error: (error) => {
        console.error('Error getting publications', error);
      }
    });

    this._cdr.markForCheck();
    this.subscribeToNotificationComment();
  }

  async loadPublications() {
    if (this.loaderPublications) return;
    this.loaderPublications = true;
    try {
      const newPublications = await this._publicationService.getAllPublications(this.page, this.pageSize);
      const uniqueNewPublications = newPublications.filter(newPub => 
        !this.publications.some(pub => pub._id === newPub._id)
      );

      if (uniqueNewPublications.length > 0) {
        this.publications = [...this.publications, ...uniqueNewPublications];
      }
      this.page++;
    } catch (error) {
      console.error('Error loading publications', error);
    }
    this.loaderPublications = false;
    this._cdr.markForCheck();
  }

  onScroll(event: any) {
    const scrollTop = event.target.scrollTop;
    const scrollHeight = event.target.scrollHeight;
    const offsetHeight = event.target.offsetHeight;
    const threshold = 100;

    if (scrollTop + offsetHeight + threshold >= scrollHeight && !this.loaderPublications) {
      this.loadPublications();
    }
  }

  async subscribeToNotificationComment() {
    this._notificationCommentService.notificationComment$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(async (data: any) => {
      const newCommentInPublications = await this._publicationService.getAllPublications(this.page, this.pageSize);
      this._publicationService.updatePublications(newCommentInPublications);
    });
  }

  private async getParamsPublication(): Promise<boolean> {
    let result = false;
    const _idPublication = this._activatedRoute.snapshot.paramMap.get('_idPublication');
    if (_idPublication) {
      try {
        const publication = await lastValueFrom(this._publicationService.getPublicationId(_idPublication));
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

    const result = await firstValueFrom(this._geoLocationsService.findLocationByLatAndLng(latitude, longitude).pipe(takeUntil(this.destroy$)));
    if (result) return;

    const data = await firstValueFrom(this._geocodingService.getGeocodeLatAndLng(latitude, longitude).pipe(takeUntil(this.destroy$)));
    if (data.results && data.results.length > 0) {
      await firstValueFrom(this._geoLocationsService.createLocations(data).pipe(takeUntil(this.destroy$)));
    }
  }

  private updatePublications(publicationsData: PublicationView[]) {
    publicationsData.forEach(newPub => {
      const index = this.publications.findIndex(pub => pub._id === newPub._id);
      if (index !== -1) {
        // Verificar si la publicación ha cambiado
        if (JSON.stringify(this.publications[index]) !== JSON.stringify(newPub)) {
          this.publications[index] = newPub;
          this._cdr.markForCheck();
        }
      } else {
        this.publications.push(newPub);
        this._cdr.markForCheck();
      }
    });
    this._cdr.markForCheck();
  }

}
