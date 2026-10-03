import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import type { CollectionRepository } from '../domain/CollectionRepository';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import type { CoverRepository } from '../domain/CoverRepository';

interface RemoveComicProps {
  comicRepository: ComicRepository;
  comicFileRepository: ComicFileRepository;
  coverRepository: CoverRepository;
  progressRepository: ProgressRepository;
  collectionRepository: CollectionRepository;
}

/**
 * Removes a comic from the library, deleting its private copy, cover and progress, and taking it
 * out of every collection.
 */
export function removeComic({
  comicRepository,
  comicFileRepository,
  coverRepository,
  progressRepository,
  collectionRepository,
}: RemoveComicProps) {
  return async (comicId: string): Promise<void> => {
    if (comicId.trim() === '') throw new Error('[removeComic] comicId is required');
    // Metadata first: if a later step fails the comic is already gone from the library.
    await comicRepository.delete(comicId);
    const collections = (await collectionRepository.findAll()).filter((collection) =>
      collection.contains(comicId),
    );
    await Promise.all([
      comicFileRepository.delete(comicId),
      coverRepository.delete(comicId),
      progressRepository.delete(comicId),
      ...collections.map((collection) =>
        collectionRepository.save(collection.removeComic(comicId)),
      ),
    ]);
  };
}
