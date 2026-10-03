import { KeepAwake } from '@capacitor-community/keep-awake';

// Several features can need the screen on at once (reading, optimizing in the background):
// it may sleep again only when none of them does.
let holders = 0;

/** Keeps the screen on (or lets it sleep again). Best effort: unsupported devices are ignored. */
export async function setKeepScreenOn(enabled: boolean): Promise<void> {
  holders = Math.max(0, holders + (enabled ? 1 : -1));
  try {
    if (enabled && holders === 1) await KeepAwake.keepAwake();
    else if (!enabled && holders === 0) await KeepAwake.allowSleep();
  } catch {
    // Wake locks can be refused (battery saver, unsupported browser); reading still works.
  }
}
