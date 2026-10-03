import { useEffect, useState } from 'react';
import { getLibraryUseCases } from '../modules/library/application/factory';

/** Object URL of a comic cover thumbnail, revoked on unmount. `null` while loading or missing. */
export function useCoverUrl(comicId: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    getLibraryUseCases()
      .getComicCover(comicId)
      .then((cover) => {
        if (cancelled || !cover) return;
        objectUrl = URL.createObjectURL(cover);
        setUrl(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [comicId]);

  return url;
}
