import type { Comic } from '../domain/Comic';
import type { ComicRepository } from '../domain/ComicRepository';
import { LibraryError } from '../domain/LibraryError';

interface UpdateComicInfoProps {
  comicRepository: ComicRepository;
}

export interface ComicInfoChanges {
  title: string;
  series: string | null;
  number: string | null;
}

/**
 * Corrects a comic's title, series and volume number. The series decides which group the comic
 * joins in the library, so this is how a wrongly detected series is fixed.
 */
export function updateComicInfo({ comicRepository }: UpdateComicInfoProps) {
  return async (comicId: string, changes: ComicInfoChanges): Promise<Comic> => {
    const comic = await comicRepository.findById(comicId);
    if (!comic) throw new LibraryError('notFound', `[updateComicInfo] Unknown comic: ${comicId}`);
    const updated = comic.withInfo(changes);
    await comicRepository.save(updated);
    return updated;
  };
}
