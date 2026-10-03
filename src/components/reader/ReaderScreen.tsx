import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useProgressSaver } from '../../hooks/useProgressSaver';
import { useReadingSession } from '../../hooks/useReadingSession';
import type { ReadingSession } from '../../modules/library/application/openComicForReading';
import { SinglePageReader } from './SinglePageReader';
import styles from './Reader.module.css';

export function ReaderScreen() {
  const { comicId = '' } = useParams();
  return <LibraryComicReader key={comicId} comicId={comicId} />;
}

function LibraryComicReader({ comicId }: { comicId: string }) {
  const { t } = useTranslation();
  const state = useReadingSession(comicId);

  if (state.status === 'loading') {
    return (
      <ReaderMessage showBack={false}>
        <p role="status">{t('reader.loading')}</p>
      </ReaderMessage>
    );
  }
  if (state.status === 'error') {
    return (
      <ReaderMessage>
        <p role="alert">{t(`errors.${state.code}`)}</p>
      </ReaderMessage>
    );
  }
  return <ReadingView session={state.session} />;
}

function ReadingView({ session }: { session: ReadingSession }) {
  const { comic, opened, startPage } = session;
  const savePage = useProgressSaver(comic.getId(), opened.getPages().count());
  return (
    <SinglePageReader
      comic={opened}
      title={comic.getTitle()}
      initialPage={startPage}
      onPageChange={savePage}
    />
  );
}

function ReaderMessage({ children, showBack = true }: { children: ReactNode; showBack?: boolean }) {
  const { t } = useTranslation();
  return (
    <main className={styles.message}>
      {children}
      {showBack && (
        <Link to="/" className={styles.textButton}>
          {t('reader.backToLibrary')}
        </Link>
      )}
    </main>
  );
}
