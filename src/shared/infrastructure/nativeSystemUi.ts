import { Capacitor, registerPlugin } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

interface SystemUiPlugin {
  setImmersive(options: { enabled: boolean }): Promise<void>;
  setBarsStyle(options: { darkIcons: boolean }): Promise<void>;
}

// Android only: android/app/src/main/java/com/mangareader/app/SystemUiPlugin.java
// (hides both status and navigation bars). iOS uses the official StatusBar plugin.
const SystemUi = registerPlugin<SystemUiPlugin>('SystemUi');

const platform = () => Capacitor.getPlatform();

/** Hides or shows the system bars. Falls back to the Fullscreen API on web. */
export async function setImmersiveMode(enabled: boolean): Promise<void> {
  try {
    if (platform() === 'android') {
      await SystemUi.setImmersive({ enabled });
    } else if (platform() === 'ios') {
      await (enabled ? StatusBar.hide() : StatusBar.show());
    } else if (enabled && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else if (!enabled && document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch {
    // Bars are cosmetic: a refusal (e.g. fullscreen without a user gesture) changes nothing.
  }
}

/** Status/navigation bar icon colour: dark icons over light content, light icons over dark. */
export async function setSystemBarsStyle(darkIcons: boolean): Promise<void> {
  try {
    if (platform() === 'android') {
      await SystemUi.setBarsStyle({ darkIcons });
    } else if (platform() === 'ios') {
      // StatusBar "Light" means a light background, i.e. dark text.
      await StatusBar.setStyle({ style: darkIcons ? Style.Light : Style.Dark });
    }
  } catch {
    // Cosmetic only.
  }
}
