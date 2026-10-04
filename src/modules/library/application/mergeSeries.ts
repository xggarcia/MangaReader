import type { Comic } from '../domain/Comic';
import type { ComicRepository } from '../domain/ComicRepository';
import { LibraryError } from '../domain/LibraryError';

interface MergeSeriesProps {
  comicRepository: ComicRepository;
}

/**
 * Puts comics into one series under the given name: joins series that were detected apart
 * ("Berserk" and "Berserk Deluxe") or renames one. Volume numbers are kept, so each volume
 * keeps its place in the merged series.
 */
export function mergeSeries({ comicRepository }: MergeSeriesProps) {
  return async (comicIds: readonly string[], seriesName: string): Promise<Comic[]> => {
    const name = seriesName.trim();
    if (name === '') throw new Error('[mergeSeries] The series name must not be empty');

    const merged: Comic[] = [];
    for (const comicId of comicIds) {
      const comic = await comicRepository.findById(comicId);
      if (!comic) throw new LibraryError('notFound', `[mergeSeries] Unknown comic: ${comicId}`);
      const updated = comic.withSeries(name);
      await comicRepository.save(updated);
      merged.push(updated);
    }
    return merged;
  };
}
