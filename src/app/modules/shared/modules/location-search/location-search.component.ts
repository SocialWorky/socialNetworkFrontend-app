import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { StreetMapData } from '@shared/interfaces/streetMap.interface';
import { GeoLocationsService } from '@shared/services/apis/apiGeoLocations.service';
import { GeocodingService } from '@shared/services/apis/geocoding.service';
import { LocationService } from '@shared/services/apis/location.service';

@Component({
  selector: 'worky-location-search',
  templateUrl: './location-search.component.html',
  styleUrls: ['./location-search.component.scss']
})
export class LocationSearchComponent {
  searchTerm: string = '';

  listLocationsSearch: any[] = [];

  private unsubscribe$ = new Subject<void>();

  constructor(
    private _geocodingService: GeocodingService,
    private _geoLocationsService: GeoLocationsService,
    public dialogRef: MatDialogRef<LocationSearchComponent>,
    private _locationService: LocationService
  ) {  }

  search(event: Event) {

    this._geoLocationsService.findLocationByCity(this.searchTerm).pipe(takeUntil(this.unsubscribe$)).subscribe((response: any) => {
      this.listLocationsSearch = response;
      
      if (this.listLocationsSearch.length === 0) {
        this._geocodingService.getGeocodeCity(this.searchTerm).pipe(takeUntil(this.unsubscribe$)).subscribe((response: any) => {
          this.listLocationsSearch = response.results;
        });
      }

    });

  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.search(event);
    }
  }

  onInputChange(event: Event) {
    if (this.searchTerm.trim().length >= 3) {
      this.search(event);
    }
  }

  getCurrentLocation() {
    this._locationService.getUserLocation().then((location) => {
      this._geoLocationsService.findLocationByLatAndLng(location[0], location[1]).pipe(takeUntil(this.unsubscribe$)).subscribe((response: any) => {
        this.selectLocation(response);
      });
    });
  }

  selectLocation(location: any) {
    if (!location._id){
      const locationData: StreetMapData = {
        results: [location],
        status: { code: 200, message: 'OK'},
        total_results: 1
      };

      this._geoLocationsService.createLocations(locationData).pipe(takeUntil(this.unsubscribe$)).subscribe();
    }

    this.dialogRef.close(location);
  }

  closeDialog() {
    this.dialogRef.close();
  }

}
