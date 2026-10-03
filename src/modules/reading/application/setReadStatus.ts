import type { ProgressRepository } from '../domain/ProgressRepository';
import { ReadingProgress } from '../domain/ReadingProgress';

interface SetReadStatusProps {
  progressRepository: ProgressRepository;
  now?: () => number;
}

export interface SetReadStatusInput {
  comicId: string;
  pageCount: number;
  isRead: boolean;
}

/** Manually marks a comic as read (keeps the current page) or unread (back to page 1). */
export function setReadStatus({ progressRepository, now = Date.now }: SetReadStatusProps) {
  return async ({ comicId, pageCount, isRead }: SetReadStatusInput): Promise<ReadingProgress> => {
    if (comicId.trim() === '') throw new Error('[setReadStatus] comicId is required');

    const existing =
      (await progressRepository.findByComicId(comicId)) ??
      ReadingProgress.start({ comicId, page: 0, pageCount, now: now() });
    const progress = isRead ? existing.markAsRead() : existing.markAsUnread();

    await progressRepository.save(progress);
    return progress;
  };
}
