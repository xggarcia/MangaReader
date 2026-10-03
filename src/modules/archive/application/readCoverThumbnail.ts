import type { ArchiveRepository } from '../domain/ArchiveRepository';
import type { OpenedComic } from '../domain/OpenedComic';

/** Width of library cover thumbnails; 2x the largest grid cell for sharp covers on HiDPI. */
export const COVER_THUMBNAIL_WIDTH = 360;

interface ReadCoverThumbnailProps {
  archiveRepository: ArchiveRepository;
}

/** The first page, downscaled, used as the comic cover. */
export function readCoverThumbnail({ archiveRepository }: ReadCoverThumbnailProps) {
  return async (comic: OpenedComic): Promise<Blob> => {
    const cover = comic.getPages().at(0);
    return archiveRepository.readEntryThumbnail(
      comic.getSessionId(),
      cover.getPath(),
      cover.getMimeType(),
      COVER_THUMBNAIL_WIDTH,
    );
  };
}
