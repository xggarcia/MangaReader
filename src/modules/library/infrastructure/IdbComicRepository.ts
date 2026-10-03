import type { MangaReaderDatabase } from '../../../shared/infrastructure/db';
import { Comic } from '../domain/Comic';
import type { ComicRepository } from '../domain/ComicRepository';

export class IdbComicRepository implements ComicRepository {
  constructor(private readonly db: () => Promise<MangaReaderDatabase>) {}

  async save(comic: Comic): Promise<void> {
    await (await this.db()).put('comics', comic.toPrimitive());
  }

  async findById(id: string): Promise<Comic | null> {
    const data = await (await this.db()).get('comics', id);
    return data ? Comic.fromPrimitive(data) : null;
  }

  async findAll(): Promise<Comic[]> {
    const all = await (await this.db()).getAll('comics');
    return all.map((data) => Comic.fromPrimitive(data));
  }

  async delete(id: string): Promise<void> {
    await (await this.db()).delete('comics', id);
  }
}
