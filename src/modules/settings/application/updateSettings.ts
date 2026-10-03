import type { Settings, SettingsPrimitive } from '../domain/Settings';
import type { SettingsRepository } from '../domain/SettingsRepository';

interface UpdateSettingsProps {
  settingsRepository: SettingsRepository;
}

/** Changes some preferences and persists the result. Invalid values are rejected. */
export function updateSettings({ settingsRepository }: UpdateSettingsProps) {
  return async (changes: Partial<SettingsPrimitive>): Promise<Settings> => {
    const current = await settingsRepository.get();
    const updated = current.with(changes);
    await settingsRepository.save(updated);
    return updated;
  };
}
