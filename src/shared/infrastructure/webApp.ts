import { Capacitor } from '@capacitor/core';

/** Running as the web version (browser or home-screen web app), not inside the native apps. */
export function isWebVersion(): boolean {
  return !Capacitor.isNativePlatform();
}

/** iPhone or iPad (iPadOS reports itself as a Mac with touch support). */
export function isAppleMobile(): boolean {
  const { userAgent, maxTouchPoints } = navigator;
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** Opened from the home screen icon (standalone), rather than in a browser tab. */
export function isInstalledWebApp(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Registers the offline service worker on the web version only. Inside Capacitor the assets
 * are bundled in the app, and WKWebView cannot register workers for its custom scheme.
 */
export async function registerOfflineSupport(): Promise<void> {
  if (!isWebVersion() || !('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const { registerSW } = await import('virtual:pwa-register');
  registerSW({ immediate: true });
}

const INSTALL_HINT_KEY = 'installHintDismissed';

/** iOS Safari has no install prompt, so the web version explains "Add to Home Screen" once. */
export function shouldShowInstallHint(): boolean {
  if (!isWebVersion() || !isAppleMobile() || isInstalledWebApp()) return false;
  try {
    return localStorage.getItem(INSTALL_HINT_KEY) === null;
  } catch {
    return true;
  }
}

export function dismissInstallHint(): void {
  try {
    localStorage.setItem(INSTALL_HINT_KEY, '1');
  } catch {
    // Storage blocked (private browsing): the hint simply shows again next time.
  }
}
