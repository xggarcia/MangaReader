import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openMangaReaderDb, type MangaReaderDatabase } from '../../../../shared/infrastructure/db';
import { IdbProgressRepository } from '../../infrastructure/IdbProgressRepository';
import { aReadingProgress, aReadProgress } from '../helpers/ReadingProgressMother';

describe('IdbProgressRepository', () => {
  let repository: IdbProgressRepository;

  beforeEach(() => {
    // A fresh database per test keeps them independent.
    const db: Promise<MangaReaderDatabase> = openMangaReaderDb(`test-${crypto.randomUUID()}`);
    repository = new IdbProgressRepository(() => db);
  });

  it('persists and reads back a progress', async () => {
    const progress = aReadingProgress({ comicId: 'a', currentPage: 7 });

    await repository.save(progress);

    expect((await repository.findByComicId('a'))?.toPrimitive()).toEqual(progress.toPrimitive());
  });

  it('returns null for an unknown comic', async () => {
    expect(await repository.findByComicId('missing')).toBeNull();
  });

  it('overwrites the progress of the same comic', async () => {
    await repository.save(aReadingProgress({ comicId: 'a', currentPage: 1 }));
    await repository.save(aReadProgress({ comicId: 'a' }));

    const all = await repository.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.isRead()).toBe(true);
  });

  it('lists and deletes progress', async () => {
    await repository.save(aReadingProgress({ comicId: 'a' }));
    await repository.save(aReadingProgress({ comicId: 'b' }));

    await repository.delete('a');

    expect((await repository.findAll()).map((p) => p.getComicId())).toEqual(['b']);
  });
});
