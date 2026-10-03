import type { ArchiveRepository } from '../domain/ArchiveRepository';
import type { OpenedComic } from '../domain/OpenedComic';

interface ReadPageProps {
  archiveRepository: ArchiveRepository;
}

/** Extracts the image of a page (0-based index) as a typed Blob. */
export function readPage({ archiveRepository }: ReadPageProps) {
  return async (comic: OpenedComic, pageIndex: number): Promise<Blob> => {
    const page = comic.getPages().at(pageIndex);
    return archiveRepository.readEntry(comic.getSessionId(), page.getPath(), page.getMimeType());
  };
}
