import { getDb } from '../../../shared/infrastructure/db';
import type { SettingsRepository } from '../domain/SettingsRepository';
import { IdbSettingsRepository } from '../infrastructure/IdbSettingsRepository';
import { getSettings } from './getSettings';
import { updateSettings } from './updateSettings';

export function createSettingsUseCases(settingsRepository: SettingsRepository) {
  return {
    getSettings: getSettings({ settingsRepository }),
    updateSettings: updateSettings({ settingsRepository }),
  };
}

export type SettingsUseCases = ReturnType<typeof createSettingsUseCases>;

let instance: SettingsUseCases | null = null;

export function getSettingsUseCases(): SettingsUseCases {
  instance ??= createSettingsUseCases(new IdbSettingsRepository(getDb));
  return instance;
}
