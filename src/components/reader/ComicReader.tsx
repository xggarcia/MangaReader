import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useImmersiveMode } from '../../hooks/useImmersiveMode';
import { useKeepScreenOn } from '../../hooks/useKeepScreenOn';
import { usePageUrls, type PageRange } from '../../hooks/usePageUrls';
import { useReaderKeyboard } from '../../hooks/useReaderKeyboard';
import type { OpenedComic } from '../../modules/archive/domain/OpenedComic';
import type { PageStep } from '../../modules/reading/domain/ReadingDirection';
import { SpreadLayout } from '../../modules/reading/domain/SpreadLayout';
import { useSettingsStore } from '../../stores/settingsStore';
import { PagedView } from './PagedView';
import { ReaderOptionsSheet } from './ReaderOptionsSheet';
import { ReaderOverlay } from './ReaderOverlay';
import { WebtoonView, type WebtoonViewHandle } from './WebtoonView';
import styles from './Reader.module.css';

interface ComicReaderProps {
  comic: OpenedComic;
  title: string;
  /** 0-based page shown first. */
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

type PageSizes = ReadonlyMap<number, { width: number; height: number }>;

const SINGLE_RANGE: PageRange = { behind: 2, ahead: 4 };
// Spreads and the vertical strip show more pages at once, so keep more ready.
const WIDE_RANGE: PageRange = { behind: 3, ahead: 6 };

export function ComicReader({ comic, title, initialPage = 0, onPageChange }: ComicReaderProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.update);
  const readingMode = settings.toPrimitive().readingMode;
  const isWebtoon = readingMode === 'webtoon';
  const direction = settings.getReadingDirection();
  const fit = settings.getFitMode();
  const brightness = settings.getBrightness();

  const pageCount = comic.getPages().count();
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialPage, 0), pageCount - 1),
  );
  const [uiVisible, setUiVisible] = useState(true);
  const [pageSizes, setPageSizes] = useState<PageSizes>(new Map());
  const webtoon = useRef<WebtoonViewHandle>(null);
  const optionsId = useId();

  const { urls, failed } = usePageUrls(
    comic,
    currentIndex,
    readingMode === 'single' ? SINGLE_RANGE : WIDE_RANGE,
  );

  const widePages = useMemo(
    () =>
      new Set([...pageSizes].filter(([, size]) => size.width > size.height).map(([page]) => page)),
    [pageSizes],
  );
  const layout = useMemo(
    () =>
      readingMode === 'double'
        ? SpreadLayout.double(pageCount, widePages)
        : SpreadLayout.single(pageCount),
    [readingMode, pageCount, widePages],
  );

  const spread = layout.spreadContaining(currentIndex);

  useImmersiveMode(!uiVisible);
  useKeepScreenOn();

  useEffect(() => {
    onPageChange?.(currentIndex);
  }, [currentIndex, onPageChange]);

  const recordPageSize = useCallback((page: number, width: number, height: number) => {
    setPageSizes((sizes) => {
      const known = sizes.get(page);
      if (known && known.width === width && known.height === height) return sizes;
      return new Map(sizes).set(page, { width, height });
    });
  }, []);

  const step = useCallback(
    (pageStep: PageStep) => {
      if (isWebtoon) webtoon.current?.scrollByStep(pageStep);
      else setCurrentIndex((index) => layout.pageAfterStep(index, pageStep));
    },
    [isWebtoon, layout],
  );
  const goTo = useCallback(
    (index: number) => {
      const page = Math.min(Math.max(index, 0), pageCount - 1);
      setCurrentIndex(page);
      if (isWebtoon) webtoon.current?.scrollToPage(page);
    },
    [isWebtoon, pageCount],
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

  return (
    <div className={styles.reader}>
      <div
        className={styles.pageArea}
        style={brightness < 1 ? { filter: `brightness(${brightness})` } : undefined}
      >
        {isWebtoon ? (
          <WebtoonView
            ref={webtoon}
            pageCount={pageCount}
            initialPage={currentIndex}
            urls={urls}
            failed={failed}
            pageSizes={pageSizes}
            direction={direction}
            onVisiblePageChange={setCurrentIndex}
            onPageSize={recordPageSize}
            onToggleUi={toggleUi}
          />
        ) : (
          <PagedView
            spread={spread}
            pageCount={pageCount}
            urls={urls}
            failed={failed}
            direction={direction}
            fit={fit}
            onStep={step}
            onToggleUi={toggleUi}
            onPageSize={recordPageSize}
          />
        )}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {t('reader.pageAlt', { current: currentIndex + 1, total: pageCount })}
      </p>
      {uiVisible && (
        <ReaderOverlay
          title={title}
          currentIndex={currentIndex}
          visiblePages={isWebtoon ? [currentIndex] : spread}
          pageCount={pageCount}
          direction={direction}
          optionsId={optionsId}
          onGoTo={goTo}
        />
      )}
      <ReaderOptionsSheet id={optionsId} settings={settings} onChange={updateSettings} />
    </div>
  );
}
