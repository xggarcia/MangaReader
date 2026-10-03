import type { ArchiveFormat } from '../domain/ArchiveFormat';
import type { ArchiveRepository, OptimizeProgress } from '../domain/ArchiveRepository';
import type { ArchiveSession } from '../domain/ArchiveSession';
import type { ComicInfo } from '../domain/ComicInfo';
import type { OpenedComic } from '../domain/OpenedComic';
import type { PageQuality } from '../domain/PageQuality';
import { UnrarArchiveRepository } from './UnrarArchiveRepository';
import { ZipJsArchiveRepository } from './ZipJsArchiveRepository';

/**
 * Routes each archive to the repository for its format (ZIP or RAR) and remembers which one
 * owns each open session. Runs in the archive worker, or on the main thread as a fallback.
 */
export class DispatchingArchiveRepository implements ArchiveRepository {
  private readonly zip = new ZipJsArchiveRepository();
  private readonly rar = new UnrarArchiveRepository();
  private readonly bySession = new Map<string, ArchiveRepository>();

  async open(file: Blob, format: ArchiveFormat): Promise<ArchiveSession> {
    const repository = format.isZip() ? this.zip : this.rar;
    const session = await repository.open(file, format);
    this.bySession.set(session.getId(), repository);
    return session;
  }

  readEntry(sessionId: string, entryPath: string, mimeType: string): Promise<Blob> {
    return this.owner(sessionId).readEntry(sessionId, entryPath, mimeType);
  }

  readEntryThumbnail(
    sessionId: string,
    entryPath: string,
    mimeType: string,
    maxWidth: number,
  ): Promise<Blob> {
    return this.owner(sessionId).readEntryThumbnail(sessionId, entryPath, mimeType, maxWidth);
  }

  readComicInfo(sessionId: string, entryPath: string): Promise<ComicInfo | null> {
    return this.owner(sessionId).readComicInfo(sessionId, entryPath);
  }

  createOptimizedCopy(
    comic: OpenedComic,
    quality: PageQuality,
    onProgress?: OptimizeProgress,
  ): Promise<Blob> {
    return this.owner(comic.getSessionId()).createOptimizedCopy(comic, quality, onProgress);
  }

  async close(sessionId: string): Promise<void> {
    const repository = this.bySession.get(sessionId);
    this.bySession.delete(sessionId);
    await repository?.close(sessionId);
  }

  private owner(sessionId: string): ArchiveRepository {
    const repository = this.bySession.get(sessionId);
    if (!repository)
      throw new Error(`[DispatchingArchiveRepository] Unknown session: ${sessionId}`);
    return repository;
  }
}
