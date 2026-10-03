import { useEffect, useState } from 'react';
import { getArchiveUseCases } from '../modules/archive/application/factory';
import { ArchiveError } from '../modules/archive/domain/ArchiveError';
import type { ReadingSession } from '../modules/library/application/openComicForReading';
import { getLibraryUseCases } from '../modules/library/application/factory';
import { LibraryError } from '../modules/library/domain/LibraryError';

export type ReadingErrorCode = ArchiveError['code'] | LibraryError['code'] | 'unknown';

export type ReadingSessionState =
  | { status: 'loading' }
  | { status: 'ready'; session: ReadingSession }
  | { status: 'error'; code: ReadingErrorCode };

function errorCodeOf(error: unknown): ReadingErrorCode {
  if (ArchiveError.isArchiveError(error) || LibraryError.isLibraryError(error)) return error.code;
  return 'unknown';
}

/**
 * Opens a library comic for reading and closes its archive on unmount. Mount with
 * `key={comicId}` so another comic starts from the loading state.
 */
export function useReadingSession(comicId: string): ReadingSessionState {
  const [state, setState] = useState<ReadingSessionState>({ status: 'loading' });

  useEffect(() => {
    const { closeArchive } = getArchiveUseCases();
    let cancelled = false;
    let opened: ReadingSession | null = null;

    getLibraryUseCases()
      .openComicForReading(comicId)
      .then(
        (session) => {
          if (cancelled) {
            void closeArchive(session.opened);
            return;
          }
          opened = session;
          setState({ status: 'ready', session });
        },
        (error: unknown) => {
          if (!cancelled) setState({ status: 'error', code: errorCodeOf(error) });
        },
      );

    return () => {
      cancelled = true;
      if (opened) void closeArchive(opened.opened);
    };
  }, [comicId]);

  return state;
}
