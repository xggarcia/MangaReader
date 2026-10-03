import type { MangaReaderDatabase } from '../../../shared/infrastructure/db';
import { isQuotaExceededError } from '../../../shared/infrastructure/storageErrors';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import { LibraryError } from '../domain/LibraryError';

/** Fallback for WebViews without OPFS: Chromium keeps IndexedDB blobs as files on disk. */
export class IdbComicFileRepository implements ComicFileRepository {
  constructor(private readonly db: () => Promise<MangaReaderDatabase>) {}

  async save(comicId: string, file: Blob): Promise<void> {
    try {
      await (await this.db()).put('files', file, comicId);
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw new LibraryError('quotaExceeded', '[IdbComicFileRepository] Storage is full');
      }
      throw error;
    }
  }

  async get(comicId: string): Promise<Blob | null> {
    return (await (await this.db()).get('files', comicId)) ?? null;
  }

  async delete(comicId: string): Promise<void> {
    await (await this.db()).delete('files', comicId);
  }
}
