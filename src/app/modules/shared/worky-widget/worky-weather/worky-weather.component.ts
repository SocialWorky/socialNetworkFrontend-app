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
  foundErrorStyle = {};
  containerStyle = {};
  state = {
    error: '',
    loading: false,
    locationNotFound: false
  };

  private weatherIcons: { [key: string]: string } = {
    Clear: 'assets/img/widget/clear.png',
    Rain: 'assets/img/widget/rain.png',
    Snow: 'assets/img/widget/snow.png',
    Clouds: 'assets/img/widget/snow.png',
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

    this.state.loading = true;
    this.state.locationNotFound = false;

    this.weatherService.getWeather(this.city).pipe(
      takeUntil(this.unsubscribe$),
      catchError(err => {
        this.weatherData = null;
        this.state.error = 'Error fetching weather data';
        this.state.loading = false;
        // Si hay un error en la solicitud, asumimos que la ubicación no se encontró.
        this.state.locationNotFound = false;
        this.cdr.detectChanges();
        return of(null); // Retorna un Observable nulo para continuar el flujo
      })
    ).subscribe(
      (data) => {
        console.log('Weather data:', data);
        if (data && data.cod === '404') {
          this.weatherData = null;
          this.state.error = 'Oops! Location not found';
          this.state.locationNotFound = true;
        } else if (data) {
          this.containerStyle = { height: '450px' };
          this.isExpanded = true;
          data.main.temp = Math.round(data.main.temp);
          this.weatherData = data;
          this.localTime = new Date();
          this.state.error = '';
          this.state.locationNotFound = false;
        } else {
          // Manejar otros casos donde data es undefined o no tiene la propiedad cod
          this.state.error = '';
          this.state.locationNotFound = true;
        }
        this.state.loading = false;
        this.cdr.detectChanges();
      }
    );
    
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

