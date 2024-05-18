export interface WeatherMain {
  temp: number;
  humidity: number;
}

export interface WeatherWind {
  speed: number;
}

export interface WeatherDescription {
  main: string;
  description: string;
}

export interface WeatherData {
  cod: string;
  main: WeatherMain;
  wind: WeatherWind;
  weather: WeatherDescription[];
}
