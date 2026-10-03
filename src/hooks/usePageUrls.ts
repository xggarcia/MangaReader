import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { getArchiveUseCases } from '../modules/archive/application/factory';
import type { OpenedComic } from '../modules/archive/domain/OpenedComic';
import { EMPTY_PAGE_URL_SNAPSHOT, PageUrlCache, type PageUrlSnapshot } from './pageUrlCache';

const noopSubscribe = () => () => undefined;
const emptySnapshot = () => EMPTY_PAGE_URL_SNAPSHOT;

export interface PageRange {
  behind?: number;
  ahead?: number;
}

/** Object URLs for the pages around `currentIndex`; far pages are released automatically. */
export function usePageUrls(
  comic: OpenedComic | null,
  currentIndex: number,
  { behind, ahead }: PageRange = {},
): PageUrlSnapshot {
  const cache = useMemo(() => {
    if (!comic) return null;
    const { readPage } = getArchiveUseCases();
    return new PageUrlCache((index) => readPage(comic, index), comic.getPages().count());
  }, [comic]);

  useEffect(() => {
    return () => cache?.release();
  }, [cache]);

  useEffect(() => {
    cache?.setCurrentPage(currentIndex, { behind, ahead });
  }, [cache, currentIndex, behind, ahead]);

  return useSyncExternalStore(
    cache?.subscribe ?? noopSubscribe,
    cache?.getSnapshot ?? emptySnapshot,
  );
}
