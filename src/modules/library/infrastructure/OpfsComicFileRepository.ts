import { isQuotaExceededError } from '../../../shared/infrastructure/storageErrors';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import { LibraryError } from '../domain/LibraryError';

const DIRECTORY = 'comics';

function isNotFoundError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError';
}

/**
 * Stores comic files in the Origin Private File System. Reading returns a disk-backed File,
 * so archives are read lazily without loading them into memory.
 */
export class OpfsComicFileRepository implements ComicFileRepository {
  /** Whether this WebView supports writing to OPFS from the main thread. */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.storage?.getDirectory === 'function' &&
      typeof FileSystemFileHandle !== 'undefined' &&
      'createWritable' in FileSystemFileHandle.prototype
    );
  }

  async save(comicId: string, file: Blob): Promise<void> {
    const directory = await this.directory();
    const handle = await directory.getFileHandle(comicId, { create: true });
    try {
      const writable = await handle.createWritable();
      await file.stream().pipeTo(writable);
    } catch (error) {
      await directory.removeEntry(comicId).catch(() => undefined);
      if (isQuotaExceededError(error)) {
        throw new LibraryError('quotaExceeded', '[OpfsComicFileRepository] Storage is full');
      }
      throw error;
    }
  }

  async get(comicId: string): Promise<Blob | null> {
    try {
      const handle = await (await this.directory()).getFileHandle(comicId);
      return await handle.getFile();
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  }

  async delete(comicId: string): Promise<void> {
    try {
      await (await this.directory()).removeEntry(comicId);
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
  }

  private async directory(): Promise<FileSystemDirectoryHandle> {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(DIRECTORY, { create: true });
  }
}
