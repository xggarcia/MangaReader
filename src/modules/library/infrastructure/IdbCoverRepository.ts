import type { MangaReaderDatabase } from '../../../shared/infrastructure/db';
import type { CoverRepository } from '../domain/CoverRepository';

export class IdbCoverRepository implements CoverRepository {
  constructor(private readonly db: () => Promise<MangaReaderDatabase>) {}

  async save(comicId: string, cover: Blob): Promise<void> {
    await (await this.db()).put('covers', cover, comicId);
  }

  async get(comicId: string): Promise<Blob | null> {
    return (await (await this.db()).get('covers', comicId)) ?? null;
  }

  async delete(comicId: string): Promise<void> {
    await (await this.db()).delete('covers', comicId);
  }
}
