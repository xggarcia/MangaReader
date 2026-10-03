import { describe, expect, it } from 'vitest';
import { saveProgress } from '../../application/saveProgress';
import { aProgressRepository } from '../helpers/ProgressRepositoryMother';
import {
  aReadingProgress,
  aReadProgress,
  COMIC_ID,
  NOW,
  PAGE_COUNT,
} from '../helpers/ReadingProgressMother';

const now = () => NOW;

describe('saveProgress', () => {
  it('creates the progress the first time a comic is read', async () => {
    const progressRepository = aProgressRepository();

    const progress = await saveProgress({ progressRepository, now })({
      comicId: COMIC_ID,
      page: 3,
      pageCount: PAGE_COUNT,
    });

    expect(progress.toPrimitive()).toEqual({
      comicId: COMIC_ID,
      currentPage: 3,
      pageCount: PAGE_COUNT,
      lastReadAt: NOW,
      isRead: false,
    });
    expect(progressRepository.save).toHaveBeenCalledWith(progress);
  });

  it('updates the existing progress', async () => {
    const progressRepository = aProgressRepository({
      findByComicId: async () => aReadingProgress({ currentPage: 2 }),
    });

    const progress = await saveProgress({ progressRepository, now })({
      comicId: COMIC_ID,
      page: 8,
      pageCount: PAGE_COUNT,
    });

    expect(progress.getCurrentPage()).toBe(8);
    expect(progress.getLastReadAt()).toBe(NOW);
    expect(progressRepository.save).toHaveBeenCalledWith(progress);
  });

  it('marks the comic as read on the last page', async () => {
    const progressRepository = aProgressRepository();

    const progress = await saveProgress({ progressRepository, now })({
      comicId: COMIC_ID,
      page: PAGE_COUNT - 1,
      pageCount: PAGE_COUNT,
    });

    expect(progress.isRead()).toBe(true);
  });

  it('keeps a read comic read when reopened at an earlier page', async () => {
    const progressRepository = aProgressRepository({ findByComicId: async () => aReadProgress() });

    const progress = await saveProgress({ progressRepository, now })({
      comicId: COMIC_ID,
      page: 0,
      pageCount: PAGE_COUNT,
    });

    expect(progress.isRead()).toBe(true);
  });

  it('starts over when the page count changed (file replaced)', async () => {
    const progressRepository = aProgressRepository({
      findByComicId: async () => aReadProgress({ pageCount: 50, currentPage: 49 }),
    });

    const progress = await saveProgress({ progressRepository, now })({
      comicId: COMIC_ID,
      page: 1,
      pageCount: PAGE_COUNT,
    });

    expect(progress.getPageCount()).toBe(PAGE_COUNT);
    expect(progress.isRead()).toBe(false);
  });

  it('rejects an empty comic id without saving', async () => {
    const progressRepository = aProgressRepository();

    await expect(
      saveProgress({ progressRepository, now })({ comicId: '', page: 0, pageCount: PAGE_COUNT }),
    ).rejects.toThrow('[saveProgress]');
    expect(progressRepository.save).not.toHaveBeenCalled();
  });
});
