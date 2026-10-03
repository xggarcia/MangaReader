import { describe, expect, it } from 'vitest';
import { getProgress } from '../../application/getProgress';
import { setReadStatus } from '../../application/setReadStatus';
import { aProgressRepository } from '../helpers/ProgressRepositoryMother';
import {
  aReadingProgress,
  aReadProgress,
  COMIC_ID,
  NOW,
  PAGE_COUNT,
} from '../helpers/ReadingProgressMother';

const now = () => NOW;

describe('setReadStatus', () => {
  it('marks a never-opened comic as read', async () => {
    const progressRepository = aProgressRepository();

    const progress = await setReadStatus({ progressRepository, now })({
      comicId: COMIC_ID,
      pageCount: PAGE_COUNT,
      isRead: true,
    });

    expect(progress.isRead()).toBe(true);
    expect(progressRepository.save).toHaveBeenCalledWith(progress);
  });

  it('marks a comic in progress as read keeping its page', async () => {
    const progressRepository = aProgressRepository({
      findByComicId: async () => aReadingProgress({ currentPage: 6 }),
    });

    const progress = await setReadStatus({ progressRepository, now })({
      comicId: COMIC_ID,
      pageCount: PAGE_COUNT,
      isRead: true,
    });

    expect(progress.isRead()).toBe(true);
    expect(progress.getCurrentPage()).toBe(6);
  });

  it('marks a read comic as unread from the first page', async () => {
    const progressRepository = aProgressRepository({ findByComicId: async () => aReadProgress() });

    const progress = await setReadStatus({ progressRepository, now })({
      comicId: COMIC_ID,
      pageCount: PAGE_COUNT,
      isRead: false,
    });

    expect(progress.isRead()).toBe(false);
    expect(progress.getCurrentPage()).toBe(0);
    expect(progressRepository.save).toHaveBeenCalledWith(progress);
  });
});

describe('getProgress', () => {
  it('returns the stored progress or null', async () => {
    const stored = aReadingProgress();
    const progressRepository = aProgressRepository({
      findByComicId: async (comicId) => (comicId === COMIC_ID ? stored : null),
    });

    await expect(getProgress({ progressRepository })(COMIC_ID)).resolves.toBe(stored);
    await expect(getProgress({ progressRepository })('other')).resolves.toBeNull();
  });
});
