import * as Comlink from 'comlink';
import { ArchiveError } from '../domain/ArchiveError';
import type { ArchiveFormat } from '../domain/ArchiveFormat';
import type { ArchiveRepository, OptimizeProgress } from '../domain/ArchiveRepository';
import { ArchiveSession } from '../domain/ArchiveSession';
import { ComicInfo } from '../domain/ComicInfo';
import type { OpenedComic } from '../domain/OpenedComic';
import type { PageQuality } from '../domain/PageQuality';
import type { ArchiveWorkerApi, WorkerResult } from './worker/archiveWorkerApi';

function unwrap<T>(result: WorkerResult<T>): T {
  if (result.ok) return result.value;
  const { code, message } = result.error;
  if (code) throw new ArchiveError(code, message);
  throw new Error(message);
}

const READY_TIMEOUT_MS = 8000;

/** Main-thread ArchiveRepository that delegates all archive work to the archive Web Worker. */
export class WorkerArchiveRepository implements ArchiveRepository {
  private constructor(private readonly worker: Comlink.Remote<ArchiveWorkerApi>) {}

  /**
   * Starts the worker and waits until it answers. Resolves `null` when the platform cannot run
   * it (e.g. a WebView that refuses module workers), so callers can fall back to the main thread.
   */
  static async connect(): Promise<WorkerArchiveRepository | null> {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./worker/archive.worker.ts', import.meta.url), {
        type: 'module',
        name: 'archive',
      });
    } catch {
      return null;
    }
    const remote = Comlink.wrap<ArchiveWorkerApi>(worker);
    const failed = new Promise<false>((resolve) => {
      worker.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(() => resolve(false), READY_TIMEOUT_MS);
    });
    const ready = await Promise.race([remote.ping().catch(() => false), failed]);
    if (ready) return new WorkerArchiveRepository(remote);
    worker.terminate();
    return null;
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

  async createOptimizedCopy(
    comic: OpenedComic,
    quality: PageQuality,
    onProgress?: OptimizeProgress,
  ): Promise<Blob> {
    return unwrap(
      await this.worker.createOptimizedCopy(
        comic.toPrimitive(),
        quality.toPrimitive(),
        onProgress ? Comlink.proxy(onProgress) : undefined,
      ),
    );
  }

  async close(sessionId: string): Promise<void> {
    unwrap(await this.worker.close(sessionId));
  }
}
