// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  PRODUCTION: false,
  BASE_URL: import.meta.env.NG_APP_BASE_URL,
  API_URL: import.meta.env.NG_APP_API_URL,
  CLIEN_ID_GOOGLE: import.meta.env.NG_APP_CLIEN_ID_GOOGLE,
  WSURL: import.meta.env.NG_APP_WSURL,
  OPENCAGEAPIKEY: import.meta.env.NG_APP_OPENCAGEAPIKEY,
  APIGEOLOCATIONS: import.meta.env.NG_APP_APIGEOLOCATIONS,
  APIWEATHERURL: import.meta.env.NG_APP_APIWEATHERURL,
  APIWEATHERTOKEN: import.meta.env.NG_APP_APIWEATHERTOKEN,
  APIFILESERVICE: import.meta.env.NG_APP_APIFILESERVICE,
  APIMESSAGESERVICE: import.meta.env.NG_APP_APIMESSAGESERVICE,
  APINOTIFICATIONCENTER: import.meta.env.NG_APP_APINOTIFICATIONCENTER,
  GIPHYAPIKEY: import.meta.env.NG_APP_GIPHYAPIKEY,
};


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
