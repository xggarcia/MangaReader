import type { Settings } from './Settings';

export interface SettingsRepository {
  /** Stored settings, or defaults when nothing was saved yet. */
  get(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}
