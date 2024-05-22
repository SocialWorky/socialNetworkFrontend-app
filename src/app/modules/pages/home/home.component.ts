import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, firstValueFrom, takeUntil } from 'rxjs';

import { TypePublishing } from '../../shared/addPublication/enum/addPublication.enum';
import { PublicationView } from '../../shared/interfaces/publicationView.interface';
import { PublicationService } from '../../shared/services/publication.service';
import { NotificationCommentService } from '../../shared/services/notificationComment.service';
import { AuthService } from '../../auth/services/auth.service';
import { AlertService } from '../../shared/services/alert.service';
import { Alerts, Position } from '../../shared/enums/alerts.enum';
import { translations } from '../../../../translations/translations';
import { LocationService } from '../../shared/services/location.service';
import { GeoLocationsService } from '../../shared/services/apiGeoLocations.service';
import { GeocodingService } from '../../shared/services/geocoding.service';

@Component({
  selector: 'worky-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {

  private subscription: Subscription = new Subscription();

  typePublishing = TypePublishing;

  publications:PublicationView[]= [];

  page = 1;

  pageSize = 10;

  loaderPublications?: boolean;

  private unsubscribe$ = new Subject<void>();

  constructor(
    private _publicationService: PublicationService,
    private _cdr: ChangeDetectorRef,
    private _notificationCommentService: NotificationCommentService,
    private _authService: AuthService,
    private _alertService: AlertService,
    private _locationService: LocationService,
    private _geoLocationsService: GeoLocationsService,
    private _geocodingService: GeocodingService
  ) {
    this.getLocationUser();
  }

async subscribeToNotificationComment() {
  this.subscription.add(this._notificationCommentService.notificationComment$.subscribe(async (data: any) =>  {
    // if (data.authorPublicationId === this._authService.getDecodedToken().id) { 
    //   const message = `Nuevo comentario en tu publicación`;
    //   this._alertService.showAlert('notificacion', message, Alerts.SUCCESS, Position.CENTER);
    //   return;
    // }
    const newCommentInPublications = await this._publicationService.getAllPublications(this.page, this.pageSize);
    this._publicationService.publicationsSubject.next(newCommentInPublications);
  }));
}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this._notificationCommentService) {
      this._notificationCommentService.ngOnDestroy();
    }
  }
  async ngOnInit() {
    this.loaderPublications = true;
    await this._publicationService.getAllPublications(this.page, this.pageSize);
    this.subscription.add(this._publicationService.publications$.subscribe({
      next: (publicationsData: PublicationView[]) => {
      this.loaderPublications = false;
      this.publications = publicationsData;
      this._cdr.markForCheck();
      },
      error: (error) => {
        console.error( translations['home.errorGetPublications'], error);
      }
    })
    );
    this.subscribeToNotificationComment();
  }

  private async getLocationUser() {
    const [latitude, longitude] = await this._locationService.getUserLocation();
    if (!latitude && !longitude) return
    const result = await firstValueFrom(this._geoLocationsService.findLocationByLatAndLng(latitude, longitude).pipe(takeUntil(this.unsubscribe$)));
    if (result.length !== 0) return;
    if (result.length === 0) {
      const data = await firstValueFrom(this._geocodingService.getGeocodeLatAndLng(latitude, longitude).pipe(takeUntil(this.unsubscribe$)));
      if (data.results && data.results.length > 0) {
        await firstValueFrom(this._geoLocationsService.createLocations(data).pipe(takeUntil(this.unsubscribe$)));
      }
    }
  }
}
