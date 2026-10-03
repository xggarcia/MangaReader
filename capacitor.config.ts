import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mangareader.app',
  appName: 'MangaReader',
  webDir: 'dist',
  android: {
    // No remote content: the app only loads its bundled assets.
    allowMixedContent: false,
  },
  ios: {
    // Long press opens our own cover menu; WebKit link previews would fight with it.
    allowsLinkPreview: false,
    // Content runs edge to edge; the app applies the safe-area insets itself.
    contentInset: 'never',
  },
};

export default config;
