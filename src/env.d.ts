// Define the type of the environment variables.
declare interface Env {
  readonly NODE_ENV: string;
  // Replace the following with your own environment variables.
  // Example: NGX_VERSION: string;
  [key: string]: any;
  readonly NG_APP_BASE_URL: string;
  readonly NG_APP_API_URL: string;
  readonly NG_APP_CLIEN_ID_GOOGLE: string;
  readonly NG_APP_WSURL: string;
  readonly NG_APP_OPENCAGEAPIKEY: string;
  readonly NG_APP_APIGEOLOCATIONS: string;
  readonly NG_APP_APIWEATHERURL: string;
  readonly NG_APP_APIWEATHERTOKEN: string;
  readonly NG_APP_APIFILESERVICE: string;
  readonly NG_APP_APIMESSAGESERVICE: string;
  readonly NG_APP_APINOTIFICATIONCENTER: string;
  readonly NG_APP_GIPHYAPIKEY: string;
}

// Choose how to access the environment variables.
// Remove the unused options.

// 1. Use import.meta.env.YOUR_ENV_VAR in your code. (conventional)
declare interface ImportMeta {
  readonly env: Env;
}

// 2. Use _NGX_ENV_.YOUR_ENV_VAR in your code. (customizable)
// You can modify the name of the variable in angular.json.
// ngxEnv: {
//  define: '_NGX_ENV_',
// }
declare const _NGX_ENV_: Env;

// 3. Use process.env.YOUR_ENV_VAR in your code. (deprecated)
declare namespace NodeJS {
  export interface ProcessEnv extends Env {}
}
