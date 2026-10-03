import type { MangaReaderDatabase } from '../../../shared/infrastructure/db';
import type { ProgressRepository } from '../domain/ProgressRepository';
import { ReadingProgress } from '../domain/ReadingProgress';

export class IdbProgressRepository implements ProgressRepository {
  constructor(private readonly db: () => Promise<MangaReaderDatabase>) {}

  async save(progress: ReadingProgress): Promise<void> {
    await (await this.db()).put('progress', progress.toPrimitive());
  }

  async findByComicId(comicId: string): Promise<ReadingProgress | null> {
    const data = await (await this.db()).get('progress', comicId);
    return data ? ReadingProgress.fromPrimitive(data) : null;
  }

  async findAll(): Promise<ReadingProgress[]> {
    const all = await (await this.db()).getAll('progress');
    return all.map((data) => ReadingProgress.fromPrimitive(data));
  }

  async delete(comicId: string): Promise<void> {
    await (await this.db()).delete('progress', comicId);
  }
}
