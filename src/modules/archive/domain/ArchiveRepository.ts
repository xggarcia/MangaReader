import type { ArchiveFormat } from './ArchiveFormat';
import type { ArchiveSession } from './ArchiveSession';

/**
 * Reads comic archives. Implementations keep the opened archive in memory until `close`
 * so pages can be extracted on demand. Failures are reported as `ArchiveError`.
 */
export interface ArchiveRepository {
  open(file: Blob, format: ArchiveFormat): Promise<ArchiveSession>;
  /** Extracts one entry; `mimeType` is applied to the returned Blob. */
  readEntry(sessionId: string, entryPath: string, mimeType: string): Promise<Blob>;
  close(sessionId: string): Promise<void>;
}
