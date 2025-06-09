import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

import { AuthService } from '@auth/services/auth.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

type UserCoordinates = [number, number];

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private _userLocation?: UserCoordinates;

  private _locationReady = false;

  private _locationPromise?: Promise<UserCoordinates>;

  private readonly MAX_RETRIES = 5;

  private readonly INITIAL_RETRY_DELAY_MS = 5000;

  constructor(
    private _authService: AuthService,
    private _logService: LogService
  ) {}

  public async getUserLocation(): Promise<UserCoordinates> {
    if (this._locationReady && this._userLocation) {
      return this._userLocation;
    }

    if (this._locationPromise) {
      return this._locationPromise;
    }

    this._locationPromise = this.attemptGetLocationWithRetries(0);

    return this._locationPromise;
  }

  public isUserLocationReady(): boolean {
    return this._locationReady;
  }

  private async attemptGetLocationWithRetries(retryCount: number): Promise<UserCoordinates> {
    try {
      const position = await this.getRawUserLocation();
      if (!position) {
        this._logService.log(
          LevelLogEnum.WARN,
          'LocationService',
          'Position is undefined',
          {
            user: await this._authService.getDecodedToken(),
            message: 'Position is undefined',
          },
        )
        throw new Error('Position is undefined');
      }
      this._userLocation = [position.coords.latitude, position.coords.longitude];
      this._locationReady = true;
      this._locationPromise = undefined;
      return this._userLocation;
    } catch (error: any) {
      const decodedToken = await this._authService.getDecodedToken();

      this._logService.log(
        LevelLogEnum.ERROR,
        'LocationService',
        'Error getting user location',
        {
          user: decodedToken,
          message: error instanceof GeolocationPositionError ? `Code: ${error.code}, Message: ${error.message}` : error.message || error,
        },
      );

      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this._locationPromise = undefined;
            this._logService.log(
              LevelLogEnum.WARN,
              'LocationService',
              'Location permission denied',
              {
                user: decodedToken,
                message: 'Location permission denied. Please enable it in your device settings.',
              },
            )
            throw new Error('Location permission denied. Please enable it in your device settings.');

          case error.POSITION_UNAVAILABLE:
          case error.TIMEOUT:
            if (retryCount < this.MAX_RETRIES) {
              const delay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
              this._logService.log(
                LevelLogEnum.WARN,
                'LocationService',
                'Location not available. Retrying...',
                {
                  message: `Retrying to get location. Attempt ${retryCount + 1}/${this.MAX_RETRIES}`,
                  user: decodedToken,
                  afterDelay: `${delay}ms...`,
                  error: error.message,
                },
              );
              await new Promise(resolve => setTimeout(resolve, delay));
              return this.attemptGetLocationWithRetries(retryCount + 1);
            } else {
              this._locationPromise = undefined;
              this._logService.log(
                LevelLogEnum.ERROR,
                'LocationService',
                'Failed to get location after multiple attempts',
                {
                  user: decodedToken,
                  message: 'Failed to get location after multiple attempts. Please check your device settings.',
                },
              )
              throw new Error('Failed to get location after multiple attempts. Please check your device settings.');
            }

          default:
            this._locationPromise = undefined;
            this._logService.log(
              LevelLogEnum.ERROR,
              'LocationService',
              'An unknown error occurred while getting location',
              {
                user: decodedToken,
                message: 'An unknown error occurred while getting location.',
              },
            )
            throw new Error('An unknown error occurred while getting location.');
        }
      } else {
        this._locationPromise = undefined;
        this._logService.log(
          LevelLogEnum.ERROR,
          'LocationService',
          'An unexpected error occurred',
          {
            user: decodedToken,
            message: 'An unexpected error occurred:'+ (error.message || 'Unknown error'),
          },
        )
        throw new Error('An unexpected error occurred: ' + (error.message || 'Unknown error'));
      }
    }
  }

  private async getRawUserLocation(): Promise<GeolocationPosition | undefined> {
    if (Capacitor.isNativePlatform()) {
      return Geolocation.getCurrentPosition().then(position => ({
        ...position,
        toJSON: () => ({})
      })).then(position => position as GeolocationPosition);
    } else {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });
    }
  }
}
