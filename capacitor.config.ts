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
    SplashScreen: {
      launchAutoHide: true,
    },
  },
};

export default config;
