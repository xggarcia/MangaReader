import type { MangaReaderDatabase } from '../../../shared/infrastructure/db';
import { Settings } from '../domain/Settings';
import type { SettingsRepository } from '../domain/SettingsRepository';

const KEY = 'app';

export class IdbSettingsRepository implements SettingsRepository {
  constructor(private readonly db: () => Promise<MangaReaderDatabase>) {}

  async get(): Promise<Settings> {
    const stored = await (await this.db()).get('settings', KEY);
    return stored && typeof stored === 'object'
      ? Settings.fromPrimitive(stored as Record<string, unknown>)
      : Settings.defaults();
  }

  async save(settings: Settings): Promise<void> {
    await (await this.db()).put('settings', settings.toPrimitive(), KEY);
  }
}
