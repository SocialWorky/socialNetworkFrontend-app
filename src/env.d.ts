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
  readonly NG_APP_TEMPLATE_EMAIL_LOGO: string;
  readonly NG_APP_META_TITLE: string;
  readonly NG_APP_META_DESCRIPTION: string;
  readonly NG_APP_META_KEYWORDS: string;
  readonly NG_APP_META_IMAGE: string;
  readonly NG_APP_META_URL: string;
  readonly NG_APP_META_OG_SITE_NAME: string;
  readonly NG_APP_META_OG_URL: string;
  readonly NG_APP_META_OG_TITLE: string;
  readonly NG_APP_META_OG_DESCRIPTION: string;
  readonly NG_APP_META_OG_IMAGE: string;
  readonly NG_APP_META_TWITTER_CARD: string;
  readonly NG_APP_META_TWITTER_URL: string;
  readonly NG_APP_META_TWITTER_TITLE: string;
  readonly NG_APP_META_TWITTER_DESCRIPTION: string;
  readonly NG_APP_META_TWITTER_IMAGE: string;
  readonly NG_APP_PWA_NAME: string;
  readonly NG_APP_PWA_SHORT_NAME: string;
  readonly NG_APP_PWA_BACKGROUND_COLOR: string;
  readonly NG_APP_PWA_THEME_COLOR: string;
  readonly NG_APP_FIREBASE_API_KEY: string;
  readonly NG_APP_FIREBASE_AUTH_DOMAIN: string;
  readonly NG_APP_FIREBASE_PROJECT_ID: string;
  readonly NG_APP_FIREBASE_STORAGE_BUCKET: string;
  readonly NG_APP_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly NG_APP_FIREBASE_APP_ID: string;
  readonly NG_APP_FIREBASE_MEASUREMENT_ID: string;
  readonly NG_APP_FIREBASE_VAPID_KEY: string;
  readonly NG_APP_CACHE_DEBUG: string;
  readonly NG_APP_CACHE_ENABLED: string;
  readonly NG_APP_VERSION_LOGS_ENABLED: string;
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


