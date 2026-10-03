import { useEffect, useState } from 'react';
import { getArchiveUseCases } from '../modules/archive/application/factory';
import { ArchiveError, type ArchiveErrorCode } from '../modules/archive/domain/ArchiveError';
import type { OpenedComic } from '../modules/archive/domain/OpenedComic';

export type OpenedComicState =
  | { status: 'loading' }
  | { status: 'ready'; comic: OpenedComic }
  | { status: 'error'; code: ArchiveErrorCode | null };

/**
 * Opens a comic archive for reading and closes it on unmount. Mount with `key={file}` so a
 * new file starts from the loading state.
 */
export function useOpenedComic(file: Blob): OpenedComicState {
  const [state, setState] = useState<OpenedComicState>({ status: 'loading' });

  useEffect(() => {
    const { openArchive, closeArchive } = getArchiveUseCases();
    let cancelled = false;
    let opened: OpenedComic | null = null;

    openArchive(file).then(
      (comic) => {
        if (cancelled) {
          void closeArchive(comic);
          return;
        }
        opened = comic;
        setState({ status: 'ready', comic });
      },
      (error: unknown) => {
        if (!cancelled)
          setState({
            status: 'error',
            code: ArchiveError.isArchiveError(error) ? error.code : null,
          });
      },
    );

    return () => {
      cancelled = true;
      if (opened) void closeArchive(opened);
    };
  }, [file]);

  return state;
}
