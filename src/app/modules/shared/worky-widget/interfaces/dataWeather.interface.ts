export interface WeatherData {
    cod: string; // Código de estado de la respuesta
    main: {
      temp: number; // Temperatura actual
      humidity: number; // Humedad actual
    };
    wind: {
      speed: number; // Velocidad del viento
    };
    weather: [
        {
          main: string; // Grupo principal del clima (Ejemplo: Clear, Rain)
          description: string; // Descripción del clima (Ejemplo: clear sky)
        }
    ];
}  