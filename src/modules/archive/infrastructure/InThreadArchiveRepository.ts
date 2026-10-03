import type { ArchiveFormat } from '../domain/ArchiveFormat';
import type { ArchiveRepository, OptimizeProgress } from '../domain/ArchiveRepository';
import type { ArchiveSession } from '../domain/ArchiveSession';
import type { ComicInfo } from '../domain/ComicInfo';
import type { OpenedComic } from '../domain/OpenedComic';
import type { PageQuality } from '../domain/PageQuality';
import { parseComicInfoXml } from './ComicInfoXmlParser';
import { createThumbnail } from './createThumbnail';
import { writeOptimizedArchive } from './writeOptimizedArchive';

/**
 * Base for repositories that decode archives in the current thread (the archive worker).
 * Format-specific subclasses only open, extract and close; derived reads are shared here.
 */
export abstract class InThreadArchiveRepository implements ArchiveRepository {
  abstract open(file: Blob, format: ArchiveFormat): Promise<ArchiveSession>;
  abstract readEntry(sessionId: string, entryPath: string, mimeType: string): Promise<Blob>;
  abstract close(sessionId: string): Promise<void>;

  async readEntryThumbnail(
    sessionId: string,
    entryPath: string,
    mimeType: string,
    maxWidth: number,
  ): Promise<Blob> {
    return createThumbnail(await this.readEntry(sessionId, entryPath, mimeType), maxWidth);
  }

  createOptimizedCopy(
    comic: OpenedComic,
    quality: PageQuality,
    onProgress?: OptimizeProgress,
  ): Promise<Blob> {
    return writeOptimizedArchive(
      comic,
      quality,
      (entryPath, mimeType) => this.readEntry(comic.getSessionId(), entryPath, mimeType),
      onProgress,
    );
  }

  async readComicInfo(sessionId: string, entryPath: string): Promise<ComicInfo | null> {
    const xml = await (await this.readEntry(sessionId, entryPath, 'application/xml')).text();
    return parseComicInfoXml(xml);
  }
}
