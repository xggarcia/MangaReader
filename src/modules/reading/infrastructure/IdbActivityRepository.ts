import type { MangaReaderDatabase } from '../../../shared/infrastructure/db';
import type { ActivityRepository } from '../domain/ActivityRepository';
import { ReadingDay } from '../domain/ReadingDay';

export class IdbActivityRepository implements ActivityRepository {
  constructor(private readonly db: () => Promise<MangaReaderDatabase>) {}

  async findByDate(date: string): Promise<ReadingDay | null> {
    const data = await (await this.db()).get('activity', date);
    return data ? ReadingDay.fromPrimitive(data) : null;
  }

  async findAll(): Promise<ReadingDay[]> {
    const all = await (await this.db()).getAll('activity');
    return all.map((data) => ReadingDay.fromPrimitive(data));
  }

  async save(day: ReadingDay): Promise<void> {
    await (await this.db()).put('activity', day.toPrimitive());
  }
}
