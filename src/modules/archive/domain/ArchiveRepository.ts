import type { ArchiveFormat } from './ArchiveFormat';
import type { ArchiveSession } from './ArchiveSession';
import type { ComicInfo } from './ComicInfo';
import type { OpenedComic } from './OpenedComic';
import type { PageQuality } from './PageQuality';

/** Pages processed so far out of the total. */
export type OptimizeProgress = (done: number, total: number) => void;

/**
 * Reads comic archives. Implementations keep the opened archive in memory until `close`
 * so pages can be extracted on demand. Failures are reported as `ArchiveError`.
 */
export interface ArchiveRepository {
  open(file: Blob, format: ArchiveFormat): Promise<ArchiveSession>;
  /** Extracts one entry; `mimeType` is applied to the returned Blob. */
  readEntry(sessionId: string, entryPath: string, mimeType: string): Promise<Blob>;
  /** Extracts an image entry downscaled to at most `maxWidth` pixels wide. */
  readEntryThumbnail(
    sessionId: string,
    entryPath: string,
    mimeType: string,
    maxWidth: number,
  ): Promise<Blob>;
  /** Parses a ComicInfo.xml entry; `null` when it has no usable metadata. */
  readComicInfo(sessionId: string, entryPath: string): Promise<ComicInfo | null>;
  /**
   * Writes a smaller CBZ with the same pages in the same order, downscaled and recompressed
   * to `quality`. The opened archive is left untouched.
   */
  createOptimizedCopy(
    comic: OpenedComic,
    quality: PageQuality,
    onProgress?: OptimizeProgress,
  ): Promise<Blob>;
  close(sessionId: string): Promise<void>;
}
