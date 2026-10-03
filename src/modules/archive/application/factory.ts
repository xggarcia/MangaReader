import type { ArchiveRepository } from '../domain/ArchiveRepository';
import { WorkerArchiveRepository } from '../infrastructure/WorkerArchiveRepository';
import { closeArchive } from './closeArchive';
import { openArchive } from './openArchive';
import { readPage } from './readPage';

export function createArchiveUseCases(archiveRepository: ArchiveRepository) {
  return {
    openArchive: openArchive({ archiveRepository }),
    readPage: readPage({ archiveRepository }),
    closeArchive: closeArchive({ archiveRepository }),
  };
}

export type ArchiveUseCases = ReturnType<typeof createArchiveUseCases>;

let instance: ArchiveUseCases | null = null;

/** App-wide archive use cases backed by a single archive worker (created lazily). */
export function getArchiveUseCases(): ArchiveUseCases {
  instance ??= createArchiveUseCases(new WorkerArchiveRepository());
  return instance;
}
