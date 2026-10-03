import { Capacitor, registerPlugin } from '@capacitor/core';

interface SystemUiPlugin {
  setImmersive(options: { enabled: boolean }): Promise<void>;
  setBarsStyle(options: { darkIcons: boolean }): Promise<void>;
}

// Native side: android/app/src/main/java/com/mangareader/app/SystemUiPlugin.java
const SystemUi = registerPlugin<SystemUiPlugin>('SystemUi');

/** Hides or shows Android status and navigation bars. Falls back to the Fullscreen API on web. */
export async function setImmersiveMode(enabled: boolean): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await SystemUi.setImmersive({ enabled });
    return;
  }
  if (enabled && !document.fullscreenElement) {
    await document.documentElement.requestFullscreen().catch(() => undefined);
  } else if (!enabled && document.fullscreenElement) {
    await document.exitFullscreen().catch(() => undefined);
  }
}

/** Status/navigation bar icon colour: dark icons over light content, light icons over dark. */
export async function setSystemBarsStyle(darkIcons: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await SystemUi.setBarsStyle({ darkIcons }).catch(() => undefined);
}
