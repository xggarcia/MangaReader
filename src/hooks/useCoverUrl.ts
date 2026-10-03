import { useEffect, useState } from 'react';
import { coverUrlCache } from './coverUrlCache';

/** Object URL of a comic cover thumbnail (shared cache). `null` while loading or missing. */
export function useCoverUrl(comicId: string): string | null {
  const [url, setUrl] = useState<string | null>(() => coverUrlCache.peek(comicId));

  useEffect(() => {
    let cancelled = false;
    void coverUrlCache.acquire(comicId).then((loaded) => {
      if (!cancelled) setUrl(loaded);
    });
    return () => {
      cancelled = true;
      coverUrlCache.release(comicId);
    };
  }, [comicId]);

  return url;
}
