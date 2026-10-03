import * as Comlink from 'comlink';
import { ArchiveError } from '../../domain/ArchiveError';
import { ArchiveFormat, type ArchiveFormatPrimitive } from '../../domain/ArchiveFormat';
import type { ArchiveRepository } from '../../domain/ArchiveRepository';
import { UnrarArchiveRepository } from '../UnrarArchiveRepository';
import { ZipJsArchiveRepository } from '../ZipJsArchiveRepository';
import type { ArchiveWorkerApi, WorkerResult } from './archiveWorkerApi';

const zipRepository = new ZipJsArchiveRepository();
const rarRepository = new UnrarArchiveRepository();
const repositoryBySession = new Map<string, ArchiveRepository>();

function repositoryFor(format: ArchiveFormat): ArchiveRepository {
  return format.isZip() ? zipRepository : rarRepository;
}

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

function sessionRepository(sessionId: string): ArchiveRepository {
  const repository = repositoryBySession.get(sessionId);
  if (!repository) throw new Error(`[archive.worker] Unknown session: ${sessionId}`);
  return repository;
}

const api: ArchiveWorkerApi = {
  open: (file: Blob, format: ArchiveFormatPrimitive) =>
    toResult(async () => {
      const archiveFormat = ArchiveFormat.fromPrimitive(format);
      const repository = repositoryFor(archiveFormat);
      const session = await repository.open(file, archiveFormat);
      repositoryBySession.set(session.getId(), repository);
      return session.toPrimitive();
    }),

  readEntry: (sessionId: string, entryPath: string, mimeType: string) =>
    toResult(() => sessionRepository(sessionId).readEntry(sessionId, entryPath, mimeType)),

  readEntryThumbnail: (sessionId: string, entryPath: string, mimeType: string, maxWidth: number) =>
    toResult(() =>
      sessionRepository(sessionId).readEntryThumbnail(sessionId, entryPath, mimeType, maxWidth),
    ),

  readComicInfo: (sessionId: string, entryPath: string) =>
    toResult(async () => {
      const info = await sessionRepository(sessionId).readComicInfo(sessionId, entryPath);
      return info?.toPrimitive() ?? null;
    }),

  close: (sessionId: string) =>
    toResult(async () => {
      const repository = repositoryBySession.get(sessionId);
      repositoryBySession.delete(sessionId);
      await repository?.close(sessionId);
    }),
};

Comlink.expose(api);
