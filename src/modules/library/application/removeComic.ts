import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import type { CollectionRepository } from '../domain/CollectionRepository';
import type { Comic } from '../domain/Comic';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import type { CoverRepository } from '../domain/CoverRepository';

interface RemoveComicProps {
  comicRepository: ComicRepository;
  comicFileRepository: ComicFileRepository;
  coverRepository: CoverRepository;
  progressRepository: ProgressRepository;
  collectionRepository: CollectionRepository;
  now?: () => number;
}

export type RemoveResult =
  /** It had been read: the file is gone, the cover and reading record stay. */
  { status: 'archived'; comic: Comic } | { status: 'removed' };

/**
 * Deletes a comic to free space. A comic already read keeps its cover, progress and collections
 * as a record of what was read (only the file is deleted); any other comic, or one already kept
 * that way, is removed completely.
 */
export function removeComic({
  comicRepository,
  comicFileRepository,
  coverRepository,
  progressRepository,
  collectionRepository,
  now = Date.now,
}: RemoveComicProps) {
  return async (comicId: string): Promise<RemoveResult> => {
    if (comicId.trim() === '') throw new Error('[removeComic] comicId is required');
    const [comic, progress] = await Promise.all([
      comicRepository.findById(comicId),
      progressRepository.findByComicId(comicId),
    ]);

    if (comic && !comic.isArchived() && progress?.isRead()) {
      const archived = comic.archive(now());
      // Metadata first: if deleting the file fails, the space is the only thing not freed.
      await comicRepository.save(archived);
      await comicFileRepository.delete(comicId);
      return { status: 'archived', comic: archived };
    }

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
    return { status: 'removed' };
  };
}
