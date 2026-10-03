import { useCallback, useRef } from 'react';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import { useTranslation } from 'react-i18next';
import type { FitMode } from '../../modules/reading/domain/FitMode';
import type { PageStep, ReadingDirection } from '../../modules/reading/domain/ReadingDirection';
import { PageGestureLayer } from './PageGestureLayer';
import styles from './Reader.module.css';

const DOUBLE_TAP_SCALE = 2.5;
const MAX_SCALE = 5;
const ZOOM_EPSILON = 0.01;
const ZOOM_ANIMATION_MS = 200;

interface PagedViewProps {
  /** Pages shown together, in reading order. */
  spread: number[];
  pageCount: number;
  urls: ReadonlyMap<number, string>;
  failed: ReadonlySet<number>;
  direction: ReadingDirection;
  fit: FitMode;
  onStep: (step: PageStep) => void;
  onToggleUi: () => void;
  onPageSize: (page: number, width: number, height: number) => void;
}

/** Single page or two-page spread with pinch, wheel and double-tap zoom. */
export function PagedView({
  spread,
  pageCount,
  urls,
  failed,
  direction,
  fit,
  onStep,
  onToggleUi,
  onPageSize,
}: PagedViewProps) {
  const { t } = useTranslation();
  const transform = useRef<ReactZoomPanPinchRef | null>(null);

  // `ref.state` is a snapshot taken when the ref was created; the live state is on `instance`.
  const isZoomed = useCallback(
    () => (transform.current?.instance.state.scale ?? 1) > 1 + ZOOM_EPSILON,
    [],
  );

  const handleDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      // Run after the zoom library has handled the same touch, or its own end-of-gesture
      // alignment animation would cancel ours.
      setTimeout(() => {
        const ref = transform.current;
        if (!ref) return;
        if (isZoomed()) void ref.resetTransform(ZOOM_ANIMATION_MS);
        else void ref.zoomToPoint(DOUBLE_TAP_SCALE, clientX, clientY, ZOOM_ANIMATION_MS);
      }, 0);
    },
    [isZoomed],
  );

  const isDouble = spread.length > 1;
  const pagesOnScreen = direction.arrangeForDisplay(spread);
  const fitClass =
    fit.toPrimitive() === 'width'
      ? styles.fitWidth
      : fit.toPrimitive() === 'original'
        ? styles.fitOriginal
        : styles.fitHeight;

  return (
    <PageGestureLayer
      direction={direction}
      onStep={onStep}
      onToggleUi={onToggleUi}
      onDoubleTap={handleDoubleTap}
      isZoomed={isZoomed}
      // At original size the page is usually larger than the screen: swipes pan instead.
      swipeEnabled={fit.toPrimitive() !== 'original'}
    >
      <TransformWrapper
        // A new spread starts unzoomed and at the top.
        key={spread.join('-')}
        ref={transform}
        minScale={1}
        maxScale={MAX_SCALE}
        limitToBounds
        centerZoomedOut
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }}
        wheel={{ step: 0.15 }}
      >
        <TransformComponent
          wrapperClass={styles.zoomWrapper}
          contentClass={`${styles.spread} ${fitClass} ${isDouble ? styles.doubleSpread : ''}`}
        >
          {pagesOnScreen.map((page) => {
            const url = urls.get(page);
            const label = t('reader.pageAlt', { current: page + 1, total: pageCount });
            return url ? (
              <img
                key={page}
                className={styles.page}
                src={url}
                alt={label}
                draggable={false}
                onLoad={(event) =>
                  onPageSize(
                    page,
                    event.currentTarget.naturalWidth,
                    event.currentTarget.naturalHeight,
                  )
                }
              />
            ) : (
              <p key={page} className={styles.status} role="status">
                {failed.has(page) ? t('reader.pageError') : t('reader.loadingPage')}
              </p>
            );
          })}
        </TransformComponent>
      </TransformWrapper>
    </PageGestureLayer>
  );
}
