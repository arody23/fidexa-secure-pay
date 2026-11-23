import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fidexapay.app',
  appName: 'FidexaPay',
  webDir: 'dist',
  server: {
    // https scheme avoids mixed-content / cookie quirks in Android WebView
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#FFFFFF',
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: false,
      autoBackdropColor: 'dom',
    },
  },
};

export default config;
