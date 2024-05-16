import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { WeatherService } from '../../services/apiOpenWeather';
import { catchError, takeUntil } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { WeatherData } from '../interfaces/dataWeather.interface';

@Component({
  selector: 'worky-weather',
  templateUrl: './worky-weather.component.html',
  styleUrls: ['./worky-weather.component.scss'],
})
export class WeatherComponent implements OnDestroy {
  city: string = '';
  weatherData: WeatherData | null = null;
  localTime: Date | null = null;
  isExpanded = false;
  containerStyle = {};
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
    private weatherService: WeatherService,
    private cdr: ChangeDetectorRef
  ) {}

  searchWeather() {
    if (!this.city) {
      this.state.error = 'Please enter a city name';
      return;
    }

    this.state.locationNotFound = false;

    this.weatherService.getWeather(this.city).pipe(
      takeUntil(this.unsubscribe$),
      catchError(() => {
        this.weatherData = null;
        this.state = { ...this.state, error: 'Error fetching weather data'};
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe(data => this.handleWeatherData(data));
  }

  handleWeatherData(data: WeatherData | null) {
    console.log('Weather data received:', data);
    if (!data) {
      this.state = { ...this.state, error: '', locationNotFound: true };
    } else if (data.cod === '404') {
      this.weatherData = null;
      this.state = { ...this.state, error: 'Oops! Location not found', locationNotFound: true };
    } else {
      this.weatherData = { ...data, main: { ...data.main, temp: Math.round(data.main.temp) } };
      this.localTime = new Date();
      this.state = { ...this.state, error: '', locationNotFound: false };
      this.isExpanded = true;
      this.containerStyle = { height: '400px' }; // Aplicar estilos según sea necesario
    }
    this.cdr.detectChanges();

  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  //Esta función asegura que muestre una imagen adecuada que corresponda al estado actual del clima reportado por la API. Si el estado del clima no tiene una imagen específica asignada en el mapa de iconos, se mostrará una imagen de nube por defecto.
  getWeatherIcon(weatherData: string): string {
    return this.weatherIcons[weatherData] || 'assets/img/widget/cloud.png';
  }
}

