import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { WeatherService } from './service/apiOpenWeather.service';
import { Condition, WeatherMain } from './interfaces/dataWeather.interface';
import { WorkyButtonType, WorkyButtonTheme } from '../../../shared/buttons/models/worky-button-model';
import { LocationService } from '../../services/location.service';
import { GeocodingService } from '../../services/geocoding.service';
import { GeoLocationsService } from '../../services/apiGeoLocations.service';

@Component({
  selector: 'worky-weather',
  templateUrl: './worky-weather.component.html',
  styleUrls: ['./worky-weather.component.scss'],
})
export class WeatherComponent implements OnInit, OnDestroy {
  WorkyButtonType = WorkyButtonType;
  WorkyButtonTheme = WorkyButtonTheme;

  localTime: Date;
  i = 0;
  weatherDataString: string | null;
  WorkyWeatherData: WeatherMain;

  public weatherData: WeatherMain = {
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

  city?: string;

  get isUserLocationReady() {
    return this._locationService.isUserLocationReady;
  }

  private unsubscribe$ = new Subject<void>();

  constructor(
    private _weatherService: WeatherService,
    private _cdr: ChangeDetectorRef,
    private _locationService: LocationService,
    private _geocodingService: GeocodingService,
    private _geoLocationsService: GeoLocationsService
  ) {
    this.localTime = new Date();
    this.weatherDataString = localStorage.getItem('WorkyWeatherData');
    this.WorkyWeatherData = this.weatherDataString ? JSON.parse(this.weatherDataString) : null;
  }

  async ngOnInit(): Promise<void> {
    const verify = await this.verifyWeatherData();
    if (!verify) {
      try {
        const [latitude, longitude] = await this._locationService.getUserLocation();
        await this.setCityFromCoordinates(latitude, longitude);
        await this.getWeatherLatAndLng(latitude, longitude);
      } catch (error) {
        console.error('Error getting location or geocoding data:', error);
      } finally {
        this._cdr.markForCheck();
      }
    }
    this._cdr.markForCheck();
  }

  async setCityFromCoordinates(latitude: number, longitude: number): Promise<void> {
    try {
      const result = await this._geoLocationsService.findLocationByLatAndLng(latitude, longitude).pipe(takeUntil(this.unsubscribe$)).toPromise();
      if (result.length === 0) {
        const data = await this._geocodingService.getGeocodeLatAndLng(latitude, longitude).pipe(takeUntil(this.unsubscribe$)).toPromise();
        if (data.results && data.results.length > 0) {
          await this._geoLocationsService.createLocations(data).pipe(takeUntil(this.unsubscribe$)).toPromise();
          this.city = data.results[0].components.city || 'Unknown location';
        }
      } else {
        this.city = result[0]?.city || null;
      }
      if (this.city && !this.WorkyWeatherData.location.name) {
        await this.getWeatherLatAndLng(latitude, longitude);
      }
    } catch (error) {
      console.error('Error getting geocoding data:', error);
    }
  }

  async getWeatherLatAndLng(lat: number, lng: number): Promise<void> {
    if (!lat && !lng) return;

    this._weatherService.getWeatherLatAndLng(lat, lng).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (data) => {
        localStorage.setItem('WorkyWeatherData', JSON.stringify(data));
        this.weatherDataString = localStorage.getItem('WorkyWeatherData');
        this.weatherData = this.weatherDataString ? JSON.parse(this.weatherDataString) : null;
        this._cdr.markForCheck();
      },
      error: (error) => console.error('Error fetching weather data:', error)
    });
  }

  async getWeatherCity(city: string): Promise<void> {
    if (!city) return;

    this._geocodingService.getGeocodeCity(city).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (data) => {
        if (data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry;
          this._geoLocationsService.createLocations(data).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: () => {
              console.log('Location created:');
            },
            error: (error) => console.error('Error creating location:', error)
          });
          this._weatherService.getWeatherCity(city).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: (data) => {
              localStorage.setItem('WorkyWeatherData', JSON.stringify(data));
              this.weatherDataString = localStorage.getItem('WorkyWeatherData');
              this.weatherData = this.weatherDataString ? JSON.parse(this.weatherDataString) : null;
              this._cdr.markForCheck();
            },
            error: (error) => console.error('Error fetching weather data:', error)
          });
        }
      },
      error: (error) => console.error('Error fetching geocoding data:', error)
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async verifyWeatherData(): Promise<boolean> {
    let verify = false;
    if (this.WorkyWeatherData && this.WorkyWeatherData.forecast && this.WorkyWeatherData.forecast.forecastday.length > 0) {
      const today = this.WorkyWeatherData.forecast.forecastday;
      const currentDay = this.formatDate(this.localTime);

      const todayDate01Formatted = today[0].date.toString();
      const todayDate02Formatted = today[1].date.toString();
      const todayDate03Formatted = today[2].date.toString();

      if (todayDate01Formatted === currentDay) this.i = 0;
      if (todayDate02Formatted === currentDay) this.i = 1;
      if (todayDate03Formatted === currentDay) this.i = 2;

      if (todayDate01Formatted === currentDay || todayDate02Formatted === currentDay || todayDate03Formatted === currentDay) {
        this.weatherData = this.WorkyWeatherData;
        this.city = this.weatherData.location.name;
        verify = true;
      }
    }
    return verify;
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
