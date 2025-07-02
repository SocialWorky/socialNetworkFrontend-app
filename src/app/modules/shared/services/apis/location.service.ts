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
  private _usingFallbackLocation = false;

  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_RETRY_DELAY_MS = 5000;
  
  private readonly DEFAULT_LOCATION: UserCoordinates = [-33.4489, -70.6693];
  
  private readonly FALLBACK_LOCATIONS: Record<string, UserCoordinates> = {
    'CL': [-33.4489, -70.6693], // Santiago, Chile
    'AR': [-34.6037, -58.3816], // Buenos Aires, Argentina
    'PE': [-12.0464, -77.0428], // Lima, Perú
    'CO': [4.7110, -74.0721],   // Bogotá, Colombia
    'MX': [19.4326, -99.1332],  // Ciudad de México, México
    'ES': [40.4168, -3.7038],   // Madrid, España
    'US': [40.7128, -74.0060],  // Nueva York, Estados Unidos
    'default': [-33.4489, -70.6693] // Santiago como ubicación por defecto
  };

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

  public isUsingFallbackLocation(): boolean {
    return this._usingFallbackLocation;
  }

  public getDefaultLocation(): UserCoordinates {
    return this.DEFAULT_LOCATION;
  }

  private async attemptGetLocationWithRetries(retryCount: number): Promise<UserCoordinates> {
    try {
      const position = await this.getRawUserLocation();
      if (!position) {
        this._logService.log(
          LevelLogEnum.WARN,
          'LocationService',
          'Position is undefined, using fallback location',
          {
            user: await this._authService.getDecodedToken(),
            message: 'Position is undefined, using fallback location',
          },
        );
        return this.useFallbackLocation('Position is undefined');
      }
      
      this._userLocation = [position.coords.latitude, position.coords.longitude];
      this._locationReady = true;
      this._usingFallbackLocation = false;
      this._locationPromise = undefined;
      
      this._logService.log(
        LevelLogEnum.INFO,
        'LocationService',
        'Location obtained successfully',
        {
          user: await this._authService.getDecodedToken(),
          coordinates: this._userLocation,
        },
      );
      
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
              'Location permission denied, using fallback location',
              {
                user: decodedToken,
                message: 'Location permission denied. Using fallback location.',
              },
            );
            return this.useFallbackLocation('Permission denied');

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
                LevelLogEnum.WARN,
                'LocationService',
                'Failed to get location after multiple attempts, using fallback',
                {
                  user: decodedToken,
                  message: 'Failed to get location after multiple attempts. Using fallback location.',
                },
              );
              return this.useFallbackLocation('Multiple attempts failed');
            }

          default:
            this._locationPromise = undefined;
            this._logService.log(
              LevelLogEnum.WARN,
              'LocationService',
              'Unknown geolocation error, using fallback location',
              {
                user: decodedToken,
                message: 'An unknown error occurred while getting location. Using fallback.',
              },
            );
            return this.useFallbackLocation('Unknown geolocation error');
        }
      } else {
        this._locationPromise = undefined;
        this._logService.log(
          LevelLogEnum.WARN,
          'LocationService',
          'Unexpected error, using fallback location',
          {
            user: decodedToken,
            message: 'An unexpected error occurred: ' + (error.message || 'Unknown error') + '. Using fallback location.',
          },
        );
        return this.useFallbackLocation('Unexpected error: ' + (error.message || 'Unknown error'));
      }
    }
  }

  private async useFallbackLocation(reason: string): Promise<UserCoordinates> {
    try {
      const userCountry = await this.getUserCountry();
      const fallbackLocation = this.FALLBACK_LOCATIONS[userCountry] || this.FALLBACK_LOCATIONS['default'];
      
      this._userLocation = fallbackLocation;
      this._locationReady = true;
      this._usingFallbackLocation = true;
      this._locationPromise = undefined;

      this._logService.log(
        LevelLogEnum.INFO,
        'LocationService',
        'Using fallback location',
        {
          user: await this._authService.getDecodedToken(),
          reason: reason,
          fallbackLocation: fallbackLocation,
          userCountry: userCountry,
        },
      );

      return this._userLocation;
    } catch (error) {
      this._userLocation = this.DEFAULT_LOCATION;
      this._locationReady = true;
      this._usingFallbackLocation = true;
      this._locationPromise = undefined;

      this._logService.log(
        LevelLogEnum.ERROR,
        'LocationService',
        'Failed to get fallback location, using default',
        {
          user: await this._authService.getDecodedToken(),
          error: error,
          defaultLocation: this.DEFAULT_LOCATION,
        },
      );

      return this._userLocation;
    }
  }

  private async getUserCountry(): Promise<string> {
    try {
      if (navigator.language) {
        const language = navigator.language.toLowerCase();
        if (language.includes('es-cl') || language.includes('cl')) return 'CL';
        if (language.includes('es-ar') || language.includes('ar')) return 'AR';
        if (language.includes('es-pe') || language.includes('pe')) return 'PE';
        if (language.includes('es-co') || language.includes('co')) return 'CO';
        if (language.includes('es-mx') || language.includes('mx')) return 'MX';
        if (language.includes('es-es') || language.includes('es')) return 'ES';
        if (language.includes('en-us') || language.includes('us')) return 'US';
      }
      
      return 'CL';
    } catch (error) {
      this._logService.log(
        LevelLogEnum.WARN,
        'LocationService',
        'Could not determine user country, using default',
        {
          error: error,
        },
      );
      return 'CL';
    }
  }

  private async getRawUserLocation(): Promise<GeolocationPosition | undefined> {
    if (Capacitor.isNativePlatform()) {
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
        
        return {
          ...position,
          toJSON: () => ({})
        } as GeolocationPosition;
      } catch (error) {
        throw error;
      }
    } else {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          }
        );
      });
    }
  }

  public async refreshLocation(): Promise<UserCoordinates> {
    this._locationReady = false;
    this._userLocation = undefined;
    this._locationPromise = undefined;
    this._usingFallbackLocation = false;
    
    return this.getUserLocation();
  }

  public async getUserLocationWithInfo(): Promise<{
    coordinates: UserCoordinates;
    isFallback: boolean;
    accuracy?: number;
    timestamp?: number;
  }> {
    const coordinates = await this.getUserLocation();
    
    return {
      coordinates,
      isFallback: this._usingFallbackLocation,
    };
  }
}
