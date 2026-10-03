import { describe, expect, it } from 'vitest';
import { ReadingProgress } from '../../domain/ReadingProgress';
import {
  aReadingProgress,
  aReadingProgressPrimitive,
  aReadProgress,
  COMIC_ID,
  NOW,
  PAGE_COUNT,
} from '../helpers/ReadingProgressMother';

describe('ReadingProgress', () => {
  it('starts unread unless the first page shown is the last one', () => {
    expect(
      ReadingProgress.start({
        comicId: COMIC_ID,
        page: 0,
        pageCount: PAGE_COUNT,
        now: NOW,
      }).isRead(),
    ).toBe(false);
    expect(
      ReadingProgress.start({ comicId: COMIC_ID, page: 0, pageCount: 1, now: NOW }).isRead(),
    ).toBe(true);
  });

  it('moves to a page and updates the last read time', () => {
    const progress = aReadingProgress().withPage(9, NOW);

    expect(progress.getCurrentPage()).toBe(9);
    expect(progress.getLastReadAt()).toBe(NOW);
    expect(progress.isRead()).toBe(false);
  });

  it('marks the comic as read when the last page is reached', () => {
    expect(
      aReadingProgress()
        .withPage(PAGE_COUNT - 1, NOW)
        .isRead(),
    ).toBe(true);
  });

  it('stays read when going back to an earlier page', () => {
    expect(aReadProgress().withPage(3, NOW).isRead()).toBe(true);
  });

  it('marking as unread restarts from the first page', () => {
    const progress = aReadProgress().markAsUnread();

    expect(progress.isRead()).toBe(false);
    expect(progress.getCurrentPage()).toBe(0);
  });

  it('marking as read keeps the current page', () => {
    const progress = aReadingProgress({ currentPage: 7 }).markAsRead();

    expect(progress.isRead()).toBe(true);
    expect(progress.getCurrentPage()).toBe(7);
  });

  it('reports the fraction read, complete when read', () => {
    expect(aReadingProgress({ currentPage: 4, pageCount: 20 }).getRatio()).toBe(0.25);
    expect(aReadProgress({ currentPage: 0 }).getRatio()).toBe(1);
  });

  it('is immutable', () => {
    const original = aReadingProgress({ currentPage: 2 });

    original.withPage(10, NOW);

    expect(original.getCurrentPage()).toBe(2);
  });

  it.each([
    ['empty comicId', { comicId: ' ' }],
    ['page beyond the end', { currentPage: PAGE_COUNT }],
    ['negative page', { currentPage: -1 }],
    ['zero pages', { pageCount: 0, currentPage: 0 }],
    ['fractional page', { currentPage: 1.5 }],
    ['invalid timestamp', { lastReadAt: Number.NaN }],
  ])('rejects %s', (_, overrides) => {
    expect(() => ReadingProgress.create(aReadingProgressPrimitive(overrides))).toThrow(
      '[ReadingProgress]',
    );
  });

  it('round-trips through primitives', () => {
    const primitive = aReadingProgressPrimitive({ isRead: true });

    expect(ReadingProgress.fromPrimitive(primitive).toPrimitive()).toEqual(primitive);
  });
});
