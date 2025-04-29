import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worky.dev',
  appName: 'socialNetworkFrontend-app',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
