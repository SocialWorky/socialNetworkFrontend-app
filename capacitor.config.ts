import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worky.dev',
  appName: 'socialNetworkFrontend-app',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  ios: {
    scheme: 'https',
    contentInset: 'always'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#113355"
    }
  }
};

export default config;
