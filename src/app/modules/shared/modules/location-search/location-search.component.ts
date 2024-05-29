import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { StreetMapData } from '@shared/interfaces/streetMap.interface';
import { GeoLocationsService } from '@shared/services/apiGeoLocations.service';
import { GeocodingService } from '@shared/services/geocoding.service';
import { Subject, takeUntil } from 'rxjs';

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
    public dialogRef: MatDialogRef<LocationSearchComponent>
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

  selectLocation(location: any) {

    if (!location.id){
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
