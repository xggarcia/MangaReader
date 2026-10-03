import type { ArchiveFormat } from '../domain/ArchiveFormat';
import type { ArchiveRepository, OptimizeProgress } from '../domain/ArchiveRepository';
import type { ArchiveSession } from '../domain/ArchiveSession';
import type { ComicInfo } from '../domain/ComicInfo';
import type { OpenedComic } from '../domain/OpenedComic';
import type { PageQuality } from '../domain/PageQuality';
import { WorkerArchiveRepository } from './WorkerArchiveRepository';

/**
 * Prefers the archive Web Worker (keeps the UI smooth) and falls back to decoding on the main
 * thread when the platform cannot start it, so comics always open.
 */
export class ResilientArchiveRepository implements ArchiveRepository {
  private delegate: Promise<ArchiveRepository> | null = null;

  /** True once the fallback had to be used (for diagnostics). */
  usingMainThread = false;

  async open(file: Blob, format: ArchiveFormat): Promise<ArchiveSession> {
    return (await this.repository()).open(file, format);
  }

  async readEntry(sessionId: string, entryPath: string, mimeType: string): Promise<Blob> {
    return (await this.repository()).readEntry(sessionId, entryPath, mimeType);
  }

  async readEntryThumbnail(
    sessionId: string,
    entryPath: string,
    mimeType: string,
    maxWidth: number,
  ): Promise<Blob> {
    return (await this.repository()).readEntryThumbnail(sessionId, entryPath, mimeType, maxWidth);
  }

  async readComicInfo(sessionId: string, entryPath: string): Promise<ComicInfo | null> {
    return (await this.repository()).readComicInfo(sessionId, entryPath);
  }

  async createOptimizedCopy(
    comic: OpenedComic,
    quality: PageQuality,
    onProgress?: OptimizeProgress,
  ): Promise<Blob> {
    return (await this.repository()).createOptimizedCopy(comic, quality, onProgress);
  }

  async close(sessionId: string): Promise<void> {
    await (await this.repository()).close(sessionId);
  }

  private repository(): Promise<ArchiveRepository> {
    this.delegate ??= WorkerArchiveRepository.connect().then(async (worker) => {
      if (worker) return worker;
      this.usingMainThread = true;
      // Loaded only when needed: normally the decoders live in the worker bundle alone.
      const { DispatchingArchiveRepository } = await import('./DispatchingArchiveRepository');
      return new DispatchingArchiveRepository();
    });
    return this.delegate;
  }
}
