import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mangareader.app',
  appName: 'MangaReader',
  webDir: 'dist',
  android: {
    // No remote content: the app only loads its bundled assets.
    allowMixedContent: false,
  },
};

export default config;
