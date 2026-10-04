import { App } from '@capacitor/app';
import { useEffect } from 'react';
import { DeviceFiles, hasDeviceFiles } from '../shared/infrastructure/deviceFiles';
import { useDeviceFilesStore } from '../stores/deviceFilesStore';

/**
 * Android: imports files opened with the app or shared to it (at launch and while running), and
 * looks for new comics in the comics folder whenever the app comes back to the foreground
 * (e.g. after copying files from the computer).
 */
export function useDeviceFileEvents(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !hasDeviceFiles()) return;
    const store = useDeviceFilesStore.getState();
    void store.importReceived();
    const received = DeviceFiles.addListener('filesReceived', () => void store.importReceived());
    const resumed = App.addListener('resume', () => void store.scanFolder());
    return () => {
      void received.then((handle) => handle.remove());
      void resumed.then((handle) => handle.remove());
    };
  }, [enabled]);
}
