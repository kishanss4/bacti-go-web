import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bactigo.app',
  appName: 'BACTI-GO',
  webDir: 'dist',
  // For development: uncomment the server block to enable hot-reload from Lovable
  // For production APK: keep the server block commented out
  /*
  server: {
    url: 'https://9cab1e90-1002-4600-9f28-8024133b17b6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  */
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a1120',
    // Enable WebView debugging in debug builds
    webContentsDebuggingEnabled: true,
  },
  ios: {
    backgroundColor: '#0a1120',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a1120',
      showSpinner: true,
      spinnerColor: '#0ea5e9',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a1120',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
