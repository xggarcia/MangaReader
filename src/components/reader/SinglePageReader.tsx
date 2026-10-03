import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useImmersiveMode } from '../../hooks/useImmersiveMode';
import { usePageUrls } from '../../hooks/usePageUrls';
import { useReaderKeyboard } from '../../hooks/useReaderKeyboard';
import type { OpenedComic } from '../../modules/archive/domain/OpenedComic';
import { ReadingDirection, type PageStep } from '../../modules/reading/domain/ReadingDirection';
import { PageGestureLayer } from './PageGestureLayer';
import { ReaderOverlay } from './ReaderOverlay';
import styles from './Reader.module.css';

interface SinglePageReaderProps {
  comic: OpenedComic;
  title: string;
  /** 0-based page shown first. */
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

// Reading direction will come from settings (milestone 5); manga order by default.
const direction = ReadingDirection.default();

export function SinglePageReader({
  comic,
  title,
  initialPage = 0,
  onPageChange,
}: SinglePageReaderProps) {
  const { t } = useTranslation();
  const pageCount = comic.getPages().count();
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialPage, 0), pageCount - 1),
  );
  const [uiVisible, setUiVisible] = useState(true);
  const { urls, failed } = usePageUrls(comic, currentIndex);

  useImmersiveMode(!uiVisible);

  useEffect(() => {
    onPageChange?.(currentIndex);
  }, [currentIndex, onPageChange]);

  const goTo = useCallback(
    (index: number) => setCurrentIndex(Math.min(Math.max(index, 0), pageCount - 1)),
    [pageCount],
  );
  const step = useCallback(
    (pageStep: PageStep) =>
      setCurrentIndex((index) => Math.min(Math.max(index + pageStep, 0), pageCount - 1)),
    [pageCount],
  );
  const toggleUi = useCallback(() => setUiVisible((visible) => !visible), []);
  const goToFirst = useCallback(() => goTo(0), [goTo]);
  const goToLast = useCallback(() => goTo(pageCount - 1), [goTo, pageCount]);

  useReaderKeyboard({
    direction,
    onStep: step,
    onFirst: goToFirst,
    onLast: goToLast,
    onToggleUi: toggleUi,
  });

  const url = urls.get(currentIndex);
  const pageLabel = t('reader.pageAlt', { current: currentIndex + 1, total: pageCount });

  return (
    <div className={styles.reader}>
      <PageGestureLayer direction={direction} onStep={step} onToggleUi={toggleUi}>
        {url ? (
          <img className={styles.page} src={url} alt={pageLabel} draggable={false} />
        ) : (
          <p className={styles.status} role="status">
            {failed.has(currentIndex) ? t('reader.pageError') : t('reader.loadingPage')}
          </p>
        )}
      </PageGestureLayer>
      <p className="visually-hidden" aria-live="polite">
        {pageLabel}
      </p>
      {uiVisible && (
        <ReaderOverlay
          title={title}
          currentIndex={currentIndex}
          pageCount={pageCount}
          direction={direction}
          onGoTo={goTo}
        />
      )}
    </div>
  );
}
