import type { ProgressRepository } from '../domain/ProgressRepository';
import { ReadingProgress } from '../domain/ReadingProgress';

interface SaveProgressProps {
  progressRepository: ProgressRepository;
  now?: () => number;
}

export interface SaveProgressInput {
  comicId: string;
  /** 0-based page index. */
  page: number;
  pageCount: number;
}

/** Stores the page the user is on, creating the progress on first read. */
export function saveProgress({ progressRepository, now = Date.now }: SaveProgressProps) {
  return async ({ comicId, page, pageCount }: SaveProgressInput): Promise<ReadingProgress> => {
    if (comicId.trim() === '') throw new Error('[saveProgress] comicId is required');

    const existing = await progressRepository.findByComicId(comicId);
    const progress =
      existing && existing.getPageCount() === pageCount
        ? existing.withPage(page, now())
        : ReadingProgress.start({ comicId, page, pageCount, now: now() });

    await progressRepository.save(progress);
    return progress;
  };
}
