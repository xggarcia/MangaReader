import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useOpenedComic } from '../../hooks/useOpenedComic';
import { useReaderStore } from '../../stores/readerStore';
import { SinglePageReader } from './SinglePageReader';
import styles from './Reader.module.css';

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.(cbz|cbr|zip|rar)$/i, '');
}

export function ReaderScreen() {
  const { t } = useTranslation();
  const file = useReaderStore((state) => state.pendingFile);

  if (!file) {
    return (
      <ReaderMessage>
        <p>{t('reader.noFile')}</p>
      </ReaderMessage>
    );
  }
  return <ComicReader key={`${file.name}:${file.size}:${file.lastModified}`} file={file} />;
}

function ComicReader({ file }: { file: File }) {
  const { t } = useTranslation();
  const state = useOpenedComic(file);

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
        <p role="alert">{state.code ? t(`errors.archive.${state.code}`) : t('errors.unknown')}</p>
      </ReaderMessage>
    );
  }
  return <SinglePageReader comic={state.comic} title={titleFromFileName(file.name)} />;
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
