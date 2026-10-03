import * as Comlink from 'comlink';
import { ArchiveError } from '../../domain/ArchiveError';
import { ArchiveFormat, type ArchiveFormatPrimitive } from '../../domain/ArchiveFormat';
import { DispatchingArchiveRepository } from '../DispatchingArchiveRepository';
import type { ArchiveWorkerApi, WorkerResult } from './archiveWorkerApi';

const repository = new DispatchingArchiveRepository();

async function toResult<T>(operation: () => Promise<T>): Promise<WorkerResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: ArchiveError.isArchiveError(error) ? error.code : null,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

const api: ArchiveWorkerApi = {
  ping: async () => true,

  open: (file: Blob, format: ArchiveFormatPrimitive) =>
    toResult(async () =>
      (await repository.open(file, ArchiveFormat.fromPrimitive(format))).toPrimitive(),
    ),

  readEntry: (sessionId: string, entryPath: string, mimeType: string) =>
    toResult(() => repository.readEntry(sessionId, entryPath, mimeType)),

  readEntryThumbnail: (sessionId: string, entryPath: string, mimeType: string, maxWidth: number) =>
    toResult(() => repository.readEntryThumbnail(sessionId, entryPath, mimeType, maxWidth)),

  readComicInfo: (sessionId: string, entryPath: string) =>
    toResult(async () => {
      const info = await repository.readComicInfo(sessionId, entryPath);
      return info?.toPrimitive() ?? null;
    }),

  close: (sessionId: string) => toResult(() => repository.close(sessionId)),
};

Comlink.expose(api);
