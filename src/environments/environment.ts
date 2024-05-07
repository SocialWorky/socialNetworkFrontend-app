if (require('../../env')) {
  const env = require('../../env')
}
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  PRODUCTION: false,
  API_URL: env.API_URL || 'http://localhost/api/v1',
  BASE_URL: env.BASE_URL || 'http://localhost:4200',
  CLIEN_ID_GOOGLE: env.CLIEN_ID_GOOGLE || 'apps.googleusercontent.com',
  APP_PORT: env.APP_PORT || 4200,
  APP_VERSION: env.APP_VERSION || '1.0.0',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
