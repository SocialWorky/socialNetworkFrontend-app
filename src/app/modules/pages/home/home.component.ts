import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, firstValueFrom, lastValueFrom, takeUntil } from 'rxjs';
import { Meta } from '@angular/platform-browser';

import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { PublicationService } from '@shared/services/publication.service';
import { NotificationCommentService } from '@shared/services/notificationComment.service';
import { AuthService } from '@auth/services/auth.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { LocationService } from '@shared/services/location.service';
import { GeoLocationsService } from '@shared/services/apiGeoLocations.service';
import { GeocodingService } from '@shared/services/geocoding.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {

  private subscription: Subscription = new Subscription();

  typePublishing = TypePublishing;

  publications:PublicationView[] = [];

  page = 1;

  pageSize = 10;

  loaderPublications?: boolean;

  paramPublication?: boolean = false;

  urlMediaApi = environment.APIFILESERVICE;

  private unsubscribe$ = new Subject<void>();

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

    this.paramPublication = await this.getParamsPublication();
    if (this.paramPublication) return;
    
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

  private async getParamsPublication(): Promise<boolean> {
    let result = false;

    const _idPublication = this._activatedRoute.snapshot.paramMap.get('_idPublication');

    if (_idPublication) {
      try {
        const publication = await lastValueFrom(this._publicationService.getPublicationId(_idPublication));
        if (publication.length) {
          this.loaderPublications = false;
          this.publications = publication;
          this._meta.updateTag({ property: 'og:title', content: 'worky Social Network' });
          this._meta.updateTag({ property: 'og:description', content: this.publications[0]?.content });
          this._meta.updateTag({ property: 'og:image', content: this.urlMediaApi + this.publications[0]?.media[0].urlCompressed });

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
    if (!latitude && !longitude) return

    const result = await firstValueFrom(this._geoLocationsService.findLocationByLatAndLng(latitude, longitude).pipe(takeUntil(this.unsubscribe$)));

    if (result) return;
    if (!result) {
      const data = await firstValueFrom(this._geocodingService.getGeocodeLatAndLng(latitude, longitude).pipe(takeUntil(this.unsubscribe$)));
      if (data.results && data.results.length > 0) {
        await firstValueFrom(this._geoLocationsService.createLocations(data).pipe(takeUntil(this.unsubscribe$)));
      }
    }
  }
}
