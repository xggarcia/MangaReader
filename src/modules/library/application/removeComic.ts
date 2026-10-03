import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import type { CoverRepository } from '../domain/CoverRepository';

interface RemoveComicProps {
  comicRepository: ComicRepository;
  comicFileRepository: ComicFileRepository;
  coverRepository: CoverRepository;
  progressRepository: ProgressRepository;
}

/** Removes a comic from the library, deleting its private copy, cover and progress. */
export function removeComic({
  comicRepository,
  comicFileRepository,
  coverRepository,
  progressRepository,
}: RemoveComicProps) {
  return async (comicId: string): Promise<void> => {
    if (comicId.trim() === '') throw new Error('[removeComic] comicId is required');
    // Metadata first: if a later step fails the comic is already gone from the library.
    await comicRepository.delete(comicId);
    await Promise.all([
      comicFileRepository.delete(comicId),
      coverRepository.delete(comicId),
      progressRepository.delete(comicId),
    ]);
  };
}
