import { useCallback, useEffect, useRef } from 'react';
import { getReadingUseCases } from '../modules/reading/application/factory';

const SAVE_DELAY_MS = 500;

/**
 * Saves the current page shortly after it changes (debounced), and immediately when the app goes
 * to the background or the reader closes, so the next session resumes on the same page.
 */
export function useProgressSaver(comicId: string, pageCount: number): (page: number) => void {
  const pendingPage = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const page = pendingPage.current;
    if (page === null) return;
    pendingPage.current = null;
    void getReadingUseCases()
      .saveProgress({ comicId, page, pageCount })
      .catch(() => undefined);
  }, [comicId, pageCount]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  return useCallback(
    (page: number) => {
      pendingPage.current = page;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );
}
