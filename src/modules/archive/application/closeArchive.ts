import type { ArchiveRepository } from '../domain/ArchiveRepository';
import type { OpenedComic } from '../domain/OpenedComic';

interface CloseArchiveProps {
  archiveRepository: ArchiveRepository;
}

/** Releases the memory held for an opened comic. */
export function closeArchive({ archiveRepository }: CloseArchiveProps) {
  return async (comic: OpenedComic): Promise<void> => {
    await archiveRepository.close(comic.getSessionId());
  };
}
