// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  PRODUCTION: false,
  //API_URL: 'http://localhost:3000/api/v1', // Worky API Service Core
  API_URL: 'https://backend-dev.worky.cl/api/v1', // Worky API Service Core
  BASE_URL: 'http://localhost:4200',
  CLIEN_ID_GOOGLE: '392454930418-dunulmihmuss90c042vn359mitdjjko8.apps.googleusercontent.com',
  APP_PORT: 4200,
  APP_VERSION: '1.0.0',
  WSURL: 'https://notifications-dev.worky.cl', // Worky-socket service
  OPENCAGEAPIKEY: 'a7f24f0e6069426b9480725b48bf0403',  // GeoCoding API Key
  APIGEOLOCATIONS: 'https://geo-dev.worky.cl/api/v1', // GeoLocations API Service worky-geo-locations
  //APIGEOLOCATIONS: 'http://localhost:3013/api/v1', // GeoLocations API Service worky-geo-locations LOCAL
  APIWEATHERURL: 'https://api.weatherapi.com/v1/forecast.json', // Weather API Service URL
  APIWEATHERTOKEN: '062b9c8b637b4fc3875164009242005', // Weather API Service TOKEN
  //APIFILESERVICE: 'http://localhost:3005/', // File Service URL LOCAL
  APIFILESERVICE: 'https://file-service-dev.worky.cl/', // File Service URL
};


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
