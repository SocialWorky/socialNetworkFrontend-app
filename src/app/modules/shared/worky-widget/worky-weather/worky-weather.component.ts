import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { WeatherService } from './service/apiOpenWeather.service';
import { WeatherData } from './interfaces/dataWeather.interface';
import { WorkyButtonType, WorkyButtonTheme } from '../../../shared/buttons/models/worky-button-model';
import { LocationService } from '../../services/location.service';
import { GeocodingService } from '../../services/geocoding.service'
import { StreetMapData } from './../../interfaces/streetMap.interface';

@Component({
  selector: 'worky-weather',
  templateUrl: './worky-weather.component.html',
  styleUrls: ['./worky-weather.component.scss'],
})
export class WeatherComponent implements OnInit, OnDestroy {

  WorkyButtonType = WorkyButtonType;
  WorkyButtonTheme = WorkyButtonTheme;

  city: string | null = null;
  weatherData: WeatherData | null = null;
  localTime: Date | null = null;
  isExpanded = false;

  get isUserLocationReady() {
    return this._locationService.isUserLocationReady;
  }

  state = {
    error: '',
    locationNotFound: false
  };

  private weatherIcons: { [key: string]: string } = {
    Clear: 'assets/img/widget/clear.png',
    Rain: 'assets/img/widget/rain.png',
    Snow: 'assets/img/widget/snow.png',
    Clouds: 'assets/img/widget/cloud.png',
    Mist: 'assets/img/widget/mist.png',
    Haze: 'assets/img/widget/haze.png',
  };
  
  private unsubscribe$ = new Subject<void>();

  constructor(
    private _weatherService: WeatherService,
    private _cdr: ChangeDetectorRef,
    private _locationService: LocationService,
    private _geocodingService: GeocodingService
  ) {
    this.city = false ? 'viña del mar' : '';
    //this.searchWeather();
  }

  async ngOnInit(): Promise<void> {
    try {
      const position = await this._locationService.getUserLocation();
      const [latitude, longitude] = position;
      await this.setCityFromCoordinates(latitude, longitude);
      this.searchWeather();
    } catch (error) {
      console.error('Error getting location or geocoding data:', error);
      this.state.error = 'Error getting location or geocoding data';
    } finally {
      this._cdr.markForCheck();
    }
  }

  async setCityFromCoordinates(latitude: number, longitude: number): Promise<void> {
    try {
      const data: StreetMapData = await this._geocodingService.reverseGeocode(latitude, longitude).toPromise();
      if (data.results && data.results.length > 0) {
        this.city = data.results[0].components.city || 'Unknown location';
      }
    } catch (error) {
      console.error('Error getting geocoding data:', error);
      this.state.error = 'Error getting geocoding data';
    }
  }

  searchWeather(): void {
    this.state.locationNotFound = false;

    if (!this.city) {
      this.state.error = 'Error fetching weather data';
      return;
    }
    this._weatherService.getWeather(this.city).pipe(
      takeUntil(this.unsubscribe$),
      catchError(() => {
        this.weatherData = null;
        this.state = { ...this.state, error: 'Error fetching weather data' };
        this._cdr.markForCheck();
        return of(null);
      })
    ).subscribe(data => this.handleWeatherData(data));
  }

  handleWeatherData(data: WeatherData | null): void {
    if (!data) {
      this.state = { ...this.state, error: '', locationNotFound: true };
    } else if (data.cod === '404') {
      this.weatherData = null;
      this.state = { ...this.state, error: 'Oops! Location not found', locationNotFound: true };
    } else {
      this.weatherData = { ...data, main: { ...data.main, temp: Math.round(data.main.temp) } };
      this.localTime = new Date();
      this.state = { ...this.state, error: '', locationNotFound: false };
    }
    this._cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  getWeatherIcon(weatherData: string): string {
    return this.weatherIcons[weatherData] || 'assets/img/widget/cloud.png';
  }
}
