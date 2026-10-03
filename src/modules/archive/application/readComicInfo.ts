import type { ArchiveRepository } from '../domain/ArchiveRepository';
import type { ComicInfo } from '../domain/ComicInfo';
import type { OpenedComic } from '../domain/OpenedComic';

interface ReadComicInfoProps {
  archiveRepository: ArchiveRepository;
}

/**
 * Metadata from the comic's ComicInfo.xml, or `null` when it has none. A broken metadata file
 * never prevents reading the comic, so read failures also return `null`.
 */
export function readComicInfo({ archiveRepository }: ReadComicInfoProps) {
  return async (comic: OpenedComic): Promise<ComicInfo | null> => {
    const path = comic.getComicInfoPath();
    if (!path) return null;
    try {
      return await archiveRepository.readComicInfo(comic.getSessionId(), path);
    } catch {
      return null;
    }
  };
}
