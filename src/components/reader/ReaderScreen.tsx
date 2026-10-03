import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { goBack } from '../../app/navigation';
import { coverUrlCache } from '../../hooks/coverUrlCache';
import { useProgressSaver } from '../../hooks/useProgressSaver';
import { useDarkContentSystemBars } from '../../hooks/useSystemBars';
import { useReadingSession } from '../../hooks/useReadingSession';
import type { ReadingSession } from '../../modules/library/application/openComicForReading';
import { READER_COVER_TRANSITION } from '../library/openComic';
import controls from '../ui/Controls.module.css';
import { ComicReader } from './ComicReader';
import styles from './Reader.module.css';

export function ReaderScreen() {
  const { comicId = '' } = useParams();
  return <LibraryComicReader key={comicId} comicId={comicId} />;
}

function LibraryComicReader({ comicId }: { comicId: string }) {
  const { t } = useTranslation();
  const state = useReadingSession(comicId);
  useDarkContentSystemBars();

  if (state.status === 'loading') {
    // The cached cover stands in for the page while the archive opens; it carries the shared
    // transition name, so the cover tapped in the library grows into this position.
    const coverUrl = coverUrlCache.peek(comicId);
    return (
      <div className={styles.reader} role="status" aria-label={t('reader.loading')}>
        {coverUrl && (
          <img
            className={styles.openingCover}
            src={coverUrl}
            alt=""
            style={{ viewTransitionName: READER_COVER_TRANSITION }}
          />
        )}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <main className={styles.message}>
        <AlertCircle size={48} strokeWidth={1.5} aria-hidden className={styles.messageIcon} />
        <p role="alert">{t(`errors.${state.code}`)}</p>
        <button type="button" className={controls.filledButton} onClick={goBack}>
          {t('reader.backToLibrary')}
        </button>
      </main>
    );
  }

  return <ReadingView session={state.session} />;
}

function ReadingView({ session }: { session: ReadingSession }) {
  const { comic, opened, startPage } = session;
  const savePage = useProgressSaver(comic.getId(), opened.getPages().count());
  return (
    <ComicReader
      comic={opened}
      title={comic.getTitle()}
      initialPage={startPage}
      onPageChange={savePage}
    />
  );
}
