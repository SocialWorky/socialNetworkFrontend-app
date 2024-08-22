import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private userLocation?: [number, number];
  private locationReady = false;
  private locationPromise?: Promise<[number, number]>;

  constructor() {}

  async getUserLocation(): Promise<[number, number]> {
    if (this.locationReady && this.userLocation) {
      return this.userLocation;
    }

    if (!this.locationPromise) {
      this.locationPromise = new Promise(async (resolve, reject) => {
        try {
          let latitude: number;
          let longitude: number;

          if (Capacitor.isNativePlatform()) {
            const position = await Geolocation.getCurrentPosition();
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
          } else {
            navigator.geolocation.getCurrentPosition(
              ({ coords }) => {
                latitude = coords.latitude;
                longitude = coords.longitude;
                this.userLocation = [latitude, longitude];
                this.locationReady = true;
                resolve(this.userLocation);
              },
              (error) => {
                console.error('Error getting user location via browser:', error);
                reject('Failed to get location via browser');
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              }
            );
            return;
          }

          this.userLocation = [latitude, longitude];
          this.locationReady = true;
          resolve(this.userLocation);
        } catch (error) {
          console.error('Error getting user location:', error);
          reject('Failed to get location');
        }
      });
    }

    return this.locationPromise;
  }

  isUserLocationReady(): boolean {
    return this.locationReady;
  }
}
