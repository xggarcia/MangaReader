import type { ArchiveFormat } from '../domain/ArchiveFormat';
import type { ArchiveRepository } from '../domain/ArchiveRepository';
import type { ArchiveSession } from '../domain/ArchiveSession';
import type { ComicInfo } from '../domain/ComicInfo';
import { parseComicInfoXml } from './ComicInfoXmlParser';
import { createThumbnail } from './createThumbnail';

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

  async readComicInfo(sessionId: string, entryPath: string): Promise<ComicInfo | null> {
    const xml = await (await this.readEntry(sessionId, entryPath, 'application/xml')).text();
    return parseComicInfoXml(xml);
  }
}
