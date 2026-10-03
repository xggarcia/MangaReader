import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import type { PageStep, ReadingDirection } from '../../modules/reading/domain/ReadingDirection';
import { PageGestureLayer } from './PageGestureLayer';
import styles from './Reader.module.css';

/** Height/width ratio assumed for pages not loaded yet (typical manga page). */
const DEFAULT_ASPECT_RATIO = 1.45;
/** Fraction of the viewport scrolled by a tap or key press. */
const SCROLL_STEP = 0.85;
/** The page crossing this fraction of the viewport height counts as the current one. */
const CURRENT_PAGE_LINE = 0.3;

export interface WebtoonViewHandle {
  scrollToPage: (page: number) => void;
  scrollByStep: (step: PageStep) => void;
}

interface WebtoonViewProps {
  ref?: Ref<WebtoonViewHandle>;
  pageCount: number;
  initialPage: number;
  urls: ReadonlyMap<number, string>;
  failed: ReadonlySet<number>;
  pageSizes: ReadonlyMap<number, { width: number; height: number }>;
  direction: ReadingDirection;
  onVisiblePageChange: (page: number) => void;
  onPageSize: (page: number, width: number, height: number) => void;
  onToggleUi: () => void;
}

/** Continuous vertical strip (webtoon style). Only pages near the viewport are mounted. */
export function WebtoonView({
  ref,
  pageCount,
  initialPage,
  urls,
  failed,
  pageSizes,
  direction,
  onVisiblePageChange,
  onPageSize,
  onToggleUi,
}: WebtoonViewProps) {
  const { t } = useTranslation();
  const scrollElement = useRef<HTMLDivElement>(null);

  const estimateHeight = useCallback(
    (page: number) => {
      const width = scrollElement.current?.clientWidth ?? window.innerWidth;
      const size = pageSizes.get(page);
      return Math.round(width * (size ? size.height / size.width : DEFAULT_ASPECT_RATIO));
    },
    [pageSizes],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is not compiler-safe; this component is not memoized.
  const virtualizer = useVirtualizer({
    count: pageCount,
    getScrollElement: () => scrollElement.current,
    estimateSize: estimateHeight,
    overscan: 2,
  });

  useLayoutEffect(() => {
    if (initialPage > 0) virtualizer.scrollToIndex(initialPage, { align: 'start' });
    // Only on mount: later jumps go through the imperative handle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollByStep = useCallback((step: PageStep) => {
    const element = scrollElement.current;
    element?.scrollBy({ top: step * element.clientHeight * SCROLL_STEP, behavior: 'smooth' });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToPage: (page) => virtualizer.scrollToIndex(page, { align: 'start' }),
      scrollByStep,
    }),
    [virtualizer, scrollByStep],
  );

  const handleScroll = () => {
    const element = scrollElement.current;
    if (!element) return;
    const line = element.scrollTop + element.clientHeight * CURRENT_PAGE_LINE;
    const current = virtualizer
      .getVirtualItems()
      .find((item) => item.start <= line && item.end > line);
    if (current) onVisiblePageChange(current.index);
  };

  return (
    <PageGestureLayer direction={direction} onStep={scrollByStep} onToggleUi={onToggleUi}>
      <div ref={scrollElement} className={styles.webtoonScroll} onScroll={handleScroll}>
        <div className={styles.webtoonStrip} style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const url = urls.get(item.index);
            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className={styles.webtoonItem}
                style={{ transform: `translateY(${item.start}px)` }}
              >
                {url ? (
                  <img
                    className={styles.webtoonPage}
                    src={url}
                    alt={t('reader.pageAlt', { current: item.index + 1, total: pageCount })}
                    draggable={false}
                    onLoad={(event) =>
                      onPageSize(
                        item.index,
                        event.currentTarget.naturalWidth,
                        event.currentTarget.naturalHeight,
                      )
                    }
                  />
                ) : (
                  <div
                    className={styles.webtoonPlaceholder}
                    style={{ height: estimateHeight(item.index) }}
                  >
                    {failed.has(item.index) ? t('reader.pageError') : t('reader.loadingPage')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageGestureLayer>
  );
}
