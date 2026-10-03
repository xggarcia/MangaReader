import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import { LibraryItem } from '../domain/LibraryItem';
import { LibraryItemList } from '../domain/LibraryItemList';

interface ListLibraryProps {
  comicRepository: ComicRepository;
  progressRepository: ProgressRepository;
}

/** Every comic in the library with its reading progress. */
export function listLibrary({ comicRepository, progressRepository }: ListLibraryProps) {
  return async (): Promise<LibraryItemList> => {
    const [comics, progressList] = await Promise.all([
      comicRepository.findAll(),
      progressRepository.findAll(),
    ]);
    const progressByComic = new Map(progressList.map((p) => [p.getComicId(), p]));
    return LibraryItemList.create(
      comics.map((comic) =>
        LibraryItem.create({ comic, progress: progressByComic.get(comic.getId()) ?? null }),
      ),
    );
  };
}
