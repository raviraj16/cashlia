import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'cashlia',
  webDir: 'www',
  plugins: {
    App: {
      // Deep link configuration
      customUrlScheme: 'cashlia'
    }
  }
};

export default config;
