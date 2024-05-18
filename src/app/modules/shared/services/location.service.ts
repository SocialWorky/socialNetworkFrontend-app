import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  userLocation?: [number, number];
  locationReady = false;

  constructor() {}

  async getUserLocation(): Promise<[number, number]> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          this.userLocation = [coords.latitude, coords.longitude];
          this.locationReady = true;
          resolve(this.userLocation);
        },
        (error) => {
          console.error('Error getting user location:', error);
          reject(error);
        }
      );
    });
  }

  isUserLocationReady(): boolean {
    return this.locationReady;
  }
}
