import { goTo } from '../../app/navigation';

/** Shared element name: the tapped cover morphs into the reader while it opens. */
export const READER_COVER_TRANSITION = 'reader-cover';

/** Opens a comic, letting its cover grow into the reader. */
export function openComic(comicId: string, cover: HTMLElement | null): void {
  if (cover) cover.style.viewTransitionName = READER_COVER_TRANSITION;
  goTo(`/read/${comicId}`, 'open');
}

/** Route of a series screen (keys are normalised names, so they are URL-encoded). */
export function seriesPath(key: string): string {
  return `/series/${encodeURIComponent(key)}`;
}
