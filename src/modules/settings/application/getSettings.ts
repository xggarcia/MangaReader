import type { Settings } from '../domain/Settings';
import type { SettingsRepository } from '../domain/SettingsRepository';

interface GetSettingsProps {
  settingsRepository: SettingsRepository;
}

export function getSettings({ settingsRepository }: GetSettingsProps) {
  return async (): Promise<Settings> => settingsRepository.get();
}
