import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worky.dev',
  appName: 'socialNetworkFrontend-app',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
  },
  ios: {
    scheme: 'https',
    // 'never' makes the WKWebView render edge-to-edge (full screen) so CSS
    // env(safe-area-inset-*) drives the insets. With 'always' the webview is
    // inset below the safe areas and cannot fill the screen. Required for the
    // @capacitor-community/safe-area edge-to-edge model.
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
    // iOS-specific optimizations for Safari
    webContentsDebuggingEnabled: false,
    allowsLinkPreview: false,
    // Improve IndexedDB handling
    backgroundColor: '#ffffff',
    // Disable some features that can cause issues
    scrollEnabled: true,
    bounces: false
  },
  android: {
    // Android-specific optimizations
    backgroundColor: '#ffffff',
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#113355"
    },
    // Add iOS-specific plugin configurations
    ios: {
      // Improve storage handling
      backgroundColor: '#ffffff',
      // Disable features that can cause IndexedDB issues
      allowsLinkPreview: false,
      scrollEnabled: true,
      bounces: false
    }
  }
};

export default config;
