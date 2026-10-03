import { KeepAwake } from '@capacitor-community/keep-awake';

/** Keeps the screen on (or lets it sleep again). Best effort: unsupported devices are ignored. */
export async function setKeepScreenOn(enabled: boolean): Promise<void> {
  try {
    if (enabled) await KeepAwake.keepAwake();
    else await KeepAwake.allowSleep();
  } catch {
    // Wake locks can be refused (battery saver, unsupported browser); reading still works.
  }
}
