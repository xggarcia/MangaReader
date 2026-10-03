import type { OpenedComic } from '../../archive/domain/OpenedComic';
import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import type { Comic } from '../domain/Comic';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import { LibraryError } from '../domain/LibraryError';

export interface ReadingSession {
  comic: Comic;
  opened: OpenedComic;
  /** 0-based page to resume from. */
  startPage: number;
}

interface OpenComicForReadingProps {
  comicRepository: ComicRepository;
  comicFileRepository: ComicFileRepository;
  progressRepository: ProgressRepository;
  openArchive: (file: Blob) => Promise<OpenedComic>;
}

/** Opens a library comic and finds the page to resume from. */
export function openComicForReading({
  comicRepository,
  comicFileRepository,
  progressRepository,
  openArchive,
}: OpenComicForReadingProps) {
  return async (comicId: string): Promise<ReadingSession> => {
    const comic = await comicRepository.findById(comicId);
    if (!comic)
      throw new LibraryError('notFound', `[openComicForReading] Unknown comic: ${comicId}`);

    const file = await comicFileRepository.get(comicId);
    if (!file) throw new LibraryError('notFound', `[openComicForReading] File missing: ${comicId}`);

    const [opened, progress] = await Promise.all([
      openArchive(file),
      progressRepository.findByComicId(comicId),
    ]);
    const pageCount = opened.getPages().count();
    // A read comic opens at the page where it was left too; only an inconsistent page resets.
    const savedPage = progress?.getCurrentPage() ?? 0;
    const startPage = savedPage < pageCount ? savedPage : 0;

    return { comic, opened, startPage };
  };
}
