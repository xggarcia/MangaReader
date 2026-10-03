import type { MangaReaderDatabase } from '../../../shared/infrastructure/db';
import { Collection } from '../domain/Collection';
import type { CollectionRepository } from '../domain/CollectionRepository';

export class IdbCollectionRepository implements CollectionRepository {
  constructor(private readonly db: () => Promise<MangaReaderDatabase>) {}

  async save(collection: Collection): Promise<void> {
    await (await this.db()).put('collections', collection.toPrimitive());
  }

  async findById(id: string): Promise<Collection | null> {
    const data = await (await this.db()).get('collections', id);
    return data ? Collection.fromPrimitive(data) : null;
  }

  async findAll(): Promise<Collection[]> {
    const all = await (await this.db()).getAll('collections');
    return all.map((data) => Collection.fromPrimitive(data));
  }

  async delete(id: string): Promise<void> {
    await (await this.db()).delete('collections', id);
  }
}
