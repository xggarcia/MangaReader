import * as Comlink from 'comlink';
import { ArchiveError } from '../domain/ArchiveError';
import type { ArchiveFormat } from '../domain/ArchiveFormat';
import type { ArchiveRepository } from '../domain/ArchiveRepository';
import { ArchiveSession } from '../domain/ArchiveSession';
import { ComicInfo } from '../domain/ComicInfo';
import type { ArchiveWorkerApi, WorkerResult } from './worker/archiveWorkerApi';

function unwrap<T>(result: WorkerResult<T>): T {
  if (result.ok) return result.value;
  const { code, message } = result.error;
  if (code) throw new ArchiveError(code, message);
  throw new Error(message);
}

/** Main-thread ArchiveRepository that delegates all archive work to the archive Web Worker. */
export class WorkerArchiveRepository implements ArchiveRepository {
  private readonly worker: Comlink.Remote<ArchiveWorkerApi>;

  constructor() {
    const worker = new Worker(new URL('./worker/archive.worker.ts', import.meta.url), {
      type: 'module',
      name: 'archive',
    });
    this.worker = Comlink.wrap<ArchiveWorkerApi>(worker);
  }

  async open(file: Blob, format: ArchiveFormat): Promise<ArchiveSession> {
    return ArchiveSession.fromPrimitive(unwrap(await this.worker.open(file, format.toPrimitive())));
  }

  async readEntry(sessionId: string, entryPath: string, mimeType: string): Promise<Blob> {
    return unwrap(await this.worker.readEntry(sessionId, entryPath, mimeType));
  }

  async readEntryThumbnail(
    sessionId: string,
    entryPath: string,
    mimeType: string,
    maxWidth: number,
  ): Promise<Blob> {
    return unwrap(await this.worker.readEntryThumbnail(sessionId, entryPath, mimeType, maxWidth));
  }

  async readComicInfo(sessionId: string, entryPath: string): Promise<ComicInfo | null> {
    const info = unwrap(await this.worker.readComicInfo(sessionId, entryPath));
    return info ? ComicInfo.fromPrimitive(info) : null;
  }

  async close(sessionId: string): Promise<void> {
    unwrap(await this.worker.close(sessionId));
  }
}
