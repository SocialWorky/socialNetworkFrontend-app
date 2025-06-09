import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, interval, firstValueFrom, of } from 'rxjs';
import { switchMap, takeUntil, catchError } from 'rxjs/operators';

import { WeatherService } from './service/apiOpenWeather.service';
import { Condition, WeatherMain } from './interfaces/dataWeather.interface';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { LocationService } from '@shared/services/apis/location.service';
import { GeocodingService } from '@shared/services/apis/geocoding.service';
import { GeoLocationsService } from '@shared/services/apis/apiGeoLocations.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { AuthService } from '@auth/services/auth.service';

@Component({
    selector: 'worky-weather',
    templateUrl: './worky-weather.component.html',
    styleUrls: ['./worky-weather.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class WeatherComponent implements OnInit, OnDestroy {
  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  localTime: Date = new Date();

  currentHour: number = 0;

  weatherData: WeatherMain = this.getInitialWeatherData();

  city?: string;

  i = 0;

  location?: [number, number];

  loading = false;

  error?: string;

  private _unsubscribe$ = new Subject<void>();

  private _timeSubscription?: Subscription;

  constructor(
    private _weatherService: WeatherService,
    private _cdr: ChangeDetectorRef,
    private _locationService: LocationService,
    private _geocodingService: GeocodingService,
    private _geoLocationsService: GeoLocationsService,
    private _logService: LogService,
    private _authService: AuthService,
  ) {
    const storedWeatherData = localStorage.getItem('WorkyWeatherData');
    if (storedWeatherData) {
      this.weatherData = JSON.parse(storedWeatherData);
    }
  }

  async ngOnInit(): Promise<void> {
    this.verifyWeatherData().then(verify => {
      if (!verify) {
        this.updateWeatherData();
      }
    });

    this.startClock();
  }

  ngOnDestroy(): void {
    this._unsubscribe$.next();
    this._unsubscribe$.complete();
    this._timeSubscription?.unsubscribe();
  }

  private getInitialWeatherData(): WeatherMain {
    return {
      location: {
        name: '',
        region: '',
        country: '',
        lat: 0,
        lon: 0,
        tz_id: '',
        localtime_epoch: 0,
        localtime: ''
      },
      current: {
        last_updated_epoch: 0,
        last_updated: '',
        temp_c: 0,
        temp_f: 0,
        is_day: 0,
        condition: {} as Condition,
        wind_mph: 0,
        wind_kph: 0,
        wind_degree: 0,
        wind_dir: '',
        pressure_mb: 0,
        pressure_in: 0,
        precip_mm: 0,
        precip_in: 0,
        humidity: 0,
        cloud: 0,
        feelslike_c: 0,
        feelslike_f: 0,
        vis_km: 0,
        vis_miles: 0,
        uv: 0,
        gust_mph: 0,
        gust_kph: 0
      },
      forecast: {
        forecastday: []
      }
    };
  }

  private startClock(): void {
    this._timeSubscription = interval(1000).pipe(
      takeUntil(this._unsubscribe$)
    ).subscribe(() => {
      this.localTime = new Date();
      this.currentHour = this.localTime.getHours();
      this._cdr.markForCheck();
    });
  }

  private async updateWeatherData(): Promise<void> {
    try {
      const [latitude, longitude] = await this._locationService.getUserLocation();
      console.log('LATITUD, LONGITUD', latitude, longitude);
      console.log('THIS.LOCATION: ', this.location);
      await this.setCityFromCoordinates(latitude, longitude);
      await this.getWeatherData(latitude, longitude);
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'WorkyWeatherComponent',
        'Error getting location or geocoding data',
        {
          user: this._authService.getDecodedToken(),
          message: error,
        },
      );
    } finally {
      this._cdr.markForCheck();
    }
  }

  private async setCityFromCoordinates(latitude: number, longitude: number): Promise<void> {
    try {
      const location = await firstValueFrom(
        this._geoLocationsService.findLocationByLatAndLng(latitude, longitude).pipe(
          takeUntil(this._unsubscribe$),
          switchMap(result => {
            if (!result) {
              return this._geocodingService.getGeocodeLatAndLng(latitude, longitude).pipe(
                switchMap(data => {
                  if (data.results && data.results.length > 0) {
                    return this._geoLocationsService.createLocations(data).pipe(
                      switchMap(() => of(data.results[0].components.city || 'Unknown location'))
                    );
                  }
                  return of('Unknown location');
                })
              );
            }
            return of(result[0]?.city || null);
          }),
          catchError(error => {
            this._logService.log(
              LevelLogEnum.ERROR,
              'WorkyWeatherComponent',
              'Error getting geocoding data',
              {
                user: this._authService.getDecodedToken(),
                message: error,
              },
            );
            return of('Unknown location');
          })
        )
      );

      this.city = location;
      if (this.city && !this.weatherData.location.name) {
        await this.getWeatherData(latitude, longitude);
      }
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'WorkyWeatherComponent',
        'Error getting geocoding data',
        {
          user: this._authService.getDecodedToken(),
          message: error,
        },
      );
    }
  }

  private getWeatherData(lat: number, lng: number): Promise<void> {
    return firstValueFrom(
      this._weatherService.getWeatherLatAndLng(lat, lng).pipe(
        takeUntil(this._unsubscribe$),
        switchMap(data => {
          localStorage.setItem('WorkyWeatherData', JSON.stringify(data));
          this.weatherData = data;
          this.city = this.weatherData.location.name;
          return of(void 0);
        }),
        catchError(error => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'WorkyWeatherComponent',
            'Error fetching weather data',
            {
              user: this._authService.getDecodedToken(),
              message: error,
            },
          );
          return of(void 0);
        })
      )
    );
  }

  private async verifyWeatherData(): Promise<boolean> {
    if (!this.weatherData.forecast || this.weatherData.forecast.forecastday.length === 0) {
      return false;
    }

    const today = this.weatherData.forecast.forecastday.map(day => day.date.toString());
    const currentDay = this.formatDate(this.localTime);

    if (today.includes(currentDay)) {
      this.city = this.weatherData.location.name;
      this._cdr.markForCheck();
      return true;
    }

    return false;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getWeatherIconUrl(iconUrl: string): string {
    return `${iconUrl}?_=${this.currentHour}`;
  }

  getWeatherCity(city?: string): void {
    if (!city) return;

    this._geocodingService.getGeocodeCity(city).pipe(
      takeUntil(this._unsubscribe$),
      switchMap(data => {
        if (data.results && data.results.length > 0) {
          return this._geoLocationsService.createLocations(data).pipe(
            switchMap(() => this._weatherService.getWeatherCity(city))
          );
        }
        return of(null);
      }),
      catchError(error => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'WorkyWeatherComponent',
          'Error fetching geocoding data',
          {
            user: this._authService.getDecodedToken(),
            message: error,
          },
        );
        return of(null);
      })
    ).subscribe({
      next: data => {
        if (data) {
          localStorage.setItem('WorkyWeatherData', JSON.stringify(data));
          this.weatherData = data;
          this._cdr.markForCheck();
        }
      },
      error: error => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'WorkyWeatherComponent',
          'Error fetching weather data',
          {
            user: this._authService.getDecodedToken(),
            message: error,
          },
        );
      }
    });
  }
}
