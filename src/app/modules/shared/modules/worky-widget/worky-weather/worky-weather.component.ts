import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, interval, firstValueFrom, of } from 'rxjs';
import { switchMap, takeUntil, catchError } from 'rxjs/operators';

import { WeatherService } from './service/apiOpenWeather.service';
import { Condition, WeatherMain } from './interfaces/dataWeather.interface';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { LocationService } from '@shared/services/apis/location.service';
import { GeocodingService } from '@shared/services/apis/geocoding.service';
import { GeoLocationsService } from '@shared/services/apis/apiGeoLocations.service';

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
  i: number = 0;

  private unsubscribe$ = new Subject<void>();
  private timeSubscription?: Subscription;

  constructor(
    private weatherService: WeatherService,
    private cdr: ChangeDetectorRef,
    private locationService: LocationService,
    private geocodingService: GeocodingService,
    private geoLocationsService: GeoLocationsService
  ) {
    const storedWeatherData = localStorage.getItem('WorkyWeatherData');
    if (storedWeatherData) {
      this.weatherData = JSON.parse(storedWeatherData);
    }
  }

  ngOnInit(): void {
    this.verifyWeatherData().then(verify => {
      if (!verify) {
        this.updateWeatherData();
      }
    });

    this.startClock();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.timeSubscription?.unsubscribe();
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
    this.timeSubscription = interval(1000).pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(() => {
      this.localTime = new Date();
      this.currentHour = this.localTime.getHours();
      this.cdr.markForCheck();
    });
  }

  private async updateWeatherData(): Promise<void> {
    try {
      const [latitude, longitude] = await this.locationService.getUserLocation();
      await this.setCityFromCoordinates(latitude, longitude);
      await this.getWeatherData(latitude, longitude);
    } catch (error) {
      console.error('Error getting location or geocoding data:', error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private async setCityFromCoordinates(latitude: number, longitude: number): Promise<void> {
    try {
      const location = await firstValueFrom(
        this.geoLocationsService.findLocationByLatAndLng(latitude, longitude).pipe(
          takeUntil(this.unsubscribe$),
          switchMap(result => {
            if (!result) {
              return this.geocodingService.getGeocodeLatAndLng(latitude, longitude).pipe(
                switchMap(data => {
                  if (data.results && data.results.length > 0) {
                    return this.geoLocationsService.createLocations(data).pipe(
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
            console.error('Error getting geocoding data:', error);
            return of('Unknown location');
          })
        )
      );

      this.city = location;
      if (this.city && !this.weatherData.location.name) {
        await this.getWeatherData(latitude, longitude);
      }
    } catch (error) {
      console.error('Error getting geocoding data:', error);
    }
  }

  private getWeatherData(lat: number, lng: number): Promise<void> {
    return firstValueFrom(
      this.weatherService.getWeatherLatAndLng(lat, lng).pipe(
        takeUntil(this.unsubscribe$),
        switchMap(data => {
          localStorage.setItem('WorkyWeatherData', JSON.stringify(data));
          this.weatherData = data;
          this.city = this.weatherData.location.name;
          return of(void 0);
        }),
        catchError(error => {
          console.error('Error fetching weather data:', error);
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
      this.cdr.markForCheck();
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

  // Método para obtener el clima por ciudad
  getWeatherCity(city?: string): void {
    if (!city) return;

    this.geocodingService.getGeocodeCity(city).pipe(
      takeUntil(this.unsubscribe$),
      switchMap(data => {
        if (data.results && data.results.length > 0) {
          return this.geoLocationsService.createLocations(data).pipe(
            switchMap(() => this.weatherService.getWeatherCity(city))
          );
        }
        return of(null);
      }),
      catchError(error => {
        console.error('Error fetching geocoding data:', error);
        return of(null);
      })
    ).subscribe({
      next: data => {
        if (data) {
          localStorage.setItem('WorkyWeatherData', JSON.stringify(data));
          this.weatherData = data;
          this.cdr.markForCheck();
        }
      },
      error: error => console.error('Error fetching weather data:', error)
    });
  }
}
