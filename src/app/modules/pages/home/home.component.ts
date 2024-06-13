import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, firstValueFrom, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
import { FriendsService } from '@shared/services/friends.service';

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
    private _friendsService: FriendsService,
  ) {
    this.getLocationUser();
  }

  async ngOnInit() {
    this.loaderPublications = true;
    this.paramPublication = await this.getParamsPublication();
    if (this.paramPublication) return;
    this._publicationService.publications$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: async (publicationsData: PublicationView[]) => {
        this.publications = await publicationsData.map((publication: PublicationView) => {
          this._friendsService.getIsMyFriend(publication.author._id).subscribe({
            next: (isMyFriend: any) => {
              publication.isMyFriend = isMyFriend;
            },
            error: (error: any) => {
              console.error('Error getting is my friend', error);
            }
          
          });
          return publication;
        });
      },
      error: (error) => {
        console.error('Error getting publications', error);
      }
    });
    await this._publicationService.getAllPublications(this.page, this.pageSize);
    this.loaderPublications = false;
    this._cdr.markForCheck();
    this.subscribeToNotificationComment();
  }

  async subscribeToNotificationComment() {
    this._notificationCommentService.notificationComment$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(async (data: any) => {
      const newCommentInPublications = await this._publicationService.getAllPublications(this.page, this.pageSize);
      this._publicationService.updatePublications(newCommentInPublications);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    if (!latitude && !longitude) return;

    const result = await firstValueFrom(this._geoLocationsService.findLocationByLatAndLng(latitude, longitude).pipe(takeUntil(this.destroy$)));
    if (result) return;

    const data = await firstValueFrom(this._geocodingService.getGeocodeLatAndLng(latitude, longitude).pipe(takeUntil(this.destroy$)));
    if (data.results && data.results.length > 0) {
      await firstValueFrom(this._geoLocationsService.createLocations(data).pipe(takeUntil(this.destroy$)));
    }
  }
}
