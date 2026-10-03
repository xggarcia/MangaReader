import { ReadingProgress, type ReadingProgressPrimitive } from '../../domain/ReadingProgress';

export const COMIC_ID = 'comic-1';
export const PAGE_COUNT = 20;
export const NOW = 1_760_000_000_000;

export function aReadingProgressPrimitive(
  overrides: Partial<ReadingProgressPrimitive> = {},
): ReadingProgressPrimitive {
  return {
    comicId: COMIC_ID,
    currentPage: 4,
    pageCount: PAGE_COUNT,
    lastReadAt: NOW - 60_000,
    isRead: false,
    ...overrides,
  };
}

export function aReadingProgress(
  overrides: Partial<ReadingProgressPrimitive> = {},
): ReadingProgress {
  return ReadingProgress.create(aReadingProgressPrimitive(overrides));
}

export function aReadProgress(overrides: Partial<ReadingProgressPrimitive> = {}): ReadingProgress {
  return aReadingProgress({ currentPage: PAGE_COUNT - 1, isRead: true, ...overrides });
}
