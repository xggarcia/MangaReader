import type { ArchiveErrorCode } from '../../domain/ArchiveError';
import type { ArchiveFormatPrimitive } from '../../domain/ArchiveFormat';
import type { ArchiveSessionPrimitive } from '../../domain/ArchiveSession';

/**
 * Results cross the worker boundary as plain data: Comlink only keeps `name` and `message`
 * of thrown errors, so failures are returned explicitly to preserve the ArchiveError code.
 */
export type WorkerResult<T> =
  { ok: true; value: T } | { ok: false; error: { code: ArchiveErrorCode | null; message: string } };

export interface ArchiveWorkerApi {
  open(file: Blob, format: ArchiveFormatPrimitive): Promise<WorkerResult<ArchiveSessionPrimitive>>;
  readEntry(sessionId: string, entryPath: string, mimeType: string): Promise<WorkerResult<Blob>>;
  readEntryThumbnail(
    sessionId: string,
    entryPath: string,
    mimeType: string,
    maxWidth: number,
  ): Promise<WorkerResult<Blob>>;
  close(sessionId: string): Promise<WorkerResult<void>>;
}
