import { App } from '@capacitor/app';
import { useEffect } from 'react';
import { hasLocalSync } from '../shared/infrastructure/localSync';
import { useDeviceTransferStore } from '../stores/deviceTransferStore';
import { useSyncStore } from '../stores/syncStore';

/** While the app is open: sync again every few minutes with paired devices around. */
const RESYNC_INTERVAL_MS = 3 * 60 * 1000;

/**
 * Android: syncs reading progress with paired devices on the same Wi-Fi whenever the app is in
 * the foreground (on launch, on returning to it and periodically), and stops listening on the
 * network when it goes to the background.
 */
export function useLocalSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !hasLocalSync()) return;
    const store = useSyncStore.getState();
    void useDeviceTransferStore.getState().init();
    void store.resume();
    const resumed = App.addListener('resume', () => void store.resume());
    const paused = App.addListener('pause', () => void store.pause());
    const timer = setInterval(() => store.syncNow(), RESYNC_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      void resumed.then((handle) => handle.remove());
      void paused.then((handle) => handle.remove());
    };
  }, [enabled]);
}
