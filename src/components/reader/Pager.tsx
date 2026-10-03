import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type PointerEvent,
  type Ref,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import { useTapZones } from '../../hooks/useTapZones';
import type { FitMode } from '../../modules/reading/domain/FitMode';
import type { PageStep, ReadingDirection } from '../../modules/reading/domain/ReadingDirection';
import type { SpreadLayout } from '../../modules/reading/domain/SpreadLayout';
import styles from './Reader.module.css';

export interface PagerHandle {
  /** Animated page turn, as if the user had swiped. */
  step: (step: PageStep) => void;
}

interface PagerProps {
  ref?: Ref<PagerHandle>;
  layout: SpreadLayout;
  currentPage: number;
  pageCount: number;
  urls: ReadonlyMap<number, string>;
  failed: ReadonlySet<number>;
  direction: ReadingDirection;
  fit: FitMode;
  onNavigate: (page: number) => void;
  onToggleUi: () => void;
  onPageSize: (page: number, width: number, height: number) => void;
}

const AXIS_LOCK_PX = 8;
const TAP_MAX_TRAVEL_PX = 10;
const COMMIT_FRACTION = 0.22;
const COMMIT_VELOCITY = 0.4; // px per ms
const EDGE_RESISTANCE = 0.32;
const DOUBLE_TAP_SCALE = 2.5;
const MAX_SCALE = 5;
const ZOOM_EPSILON = 0.01;
const ZOOM_ANIMATION_MS = 220;

type Drag = {
  id: number;
  startX: number;
  startY: number;
  axis: 'none' | 'x' | 'y';
  multiTouch: boolean;
  samples: { x: number; time: number }[];
};

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Paged reader whose pages follow the finger. The previous and next spreads sit on both sides
 * of a track; dragging moves the track directly (no React renders per frame), and on release it
 * settles to the neighbour or springs back. Taps and keys animate the same movement.
 */
export function Pager({
  ref,
  layout,
  currentPage,
  pageCount,
  urls,
  failed,
  direction,
  fit,
  onNavigate,
  onToggleUi,
  onPageSize,
}: PagerProps) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const zoom = useRef<ReactZoomPanPinchRef | null>(null);
  const drag = useRef<Drag | null>(null);
  const animation = useRef<Animation | null>(null);
  const pendingSteps = useRef<PageStep[]>([]);
  const offset = useRef(0);

  const spread = layout.spreadContaining(currentPage);
  const prevStart = layout.isFirstSpread(currentPage)
    ? null
    : layout.pageAfterStep(currentPage, -1);
  const nextStart = layout.isLastSpread(currentPage) ? null : layout.pageAfterStep(currentPage, 1);
  const rtl = direction.isRightToLeft();
  // Screen order: in manga the next spread waits on the left.
  const leftStart = rtl ? nextStart : prevStart;
  const rightStart = rtl ? prevStart : nextStart;

  const width = () => root.current?.clientWidth ?? window.innerWidth;
  const setOffset = (value: number) => {
    offset.current = value;
    if (track.current) track.current.style.transform = `translate3d(${value}px, 0, 0)`;
  };

  const isZoomed = useCallback(
    () => (zoom.current?.instance.state.scale ?? 1) > 1 + ZOOM_EPSILON,
    [],
  );

  /** Page shown after moving the track to `side` (the slot that slides into view). */
  const targetFor = useCallback(
    (side: 'left' | 'right') => (side === 'left' ? leftStart : rightStart),
    [leftStart, rightStart],
  );

  const settle = useCallback((toOffset: number, velocity: number, onDone?: () => void) => {
    const element = track.current;
    if (!element) return;
    animation.current?.cancel();
    const from = offset.current;
    if (reducedMotion() || from === toOffset) {
      setOffset(toOffset);
      onDone?.();
      return;
    }
    const distance = Math.abs(toOffset - from);
    // Faster flicks finish sooner, like a thrown sheet of paper.
    const duration = Math.max(180, Math.min(420, distance / Math.max(Math.abs(velocity), 1.4)));
    const anim = element.animate(
      [
        { transform: `translate3d(${from}px, 0, 0)` },
        { transform: `translate3d(${toOffset}px, 0, 0)` },
      ],
      { duration, easing: 'cubic-bezier(0.2, 0.9, 0.24, 1)', fill: 'forwards' },
    );
    animation.current = anim;
    anim.onfinish = () => {
      if (animation.current !== anim) return;
      setOffset(toOffset);
      onDone?.();
    };
  }, []);

  /** Moves to the neighbour on `side`; commits the page once the track has arrived. */
  const turn = useCallback(
    (side: 'left' | 'right', velocity = 0) => {
      const target = targetFor(side);
      if (target === null) {
        settle(0, velocity);
        return;
      }
      const toOffset = side === 'left' ? width() : -width();
      settle(toOffset, velocity, () => onNavigate(target));
    },
    [targetFor, settle, onNavigate],
  );

  const step = useCallback(
    (pageStep: PageStep) => {
      if (animation.current?.playState === 'running') {
        // Fast taps: finish the current turn now and queue this one.
        pendingSteps.current.push(pageStep);
        animation.current.finish();
        return;
      }
      const forwardSide = rtl ? 'left' : 'right';
      const backwardSide = rtl ? 'right' : 'left';
      turn(pageStep === 1 ? forwardSide : backwardSide);
    },
    [rtl, turn],
  );

  useImperativeHandle(ref, () => ({ step }), [step]);

  const latestStep = useRef(step);
  useLayoutEffect(() => {
    latestStep.current = step;
  });

  // After a page commit the new spread is in the centre slot: snap the track back instantly.
  // Only a page change may do this; layout updates (e.g. a wide page detected) must not cut a turn.
  useLayoutEffect(() => {
    animation.current?.cancel();
    animation.current = null;
    setOffset(0);
    const queued = pendingSteps.current.shift();
    if (queued) requestAnimationFrame(() => latestStep.current(queued));
  }, [currentPage]);

  const handleDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      // Run after the zoom library has handled the same touch, or it cancels our animation.
      setTimeout(() => {
        const controls = zoom.current;
        if (!controls) return;
        if (isZoomed()) void controls.resetTransform(ZOOM_ANIMATION_MS);
        else void controls.zoomToPoint(DOUBLE_TAP_SCALE, clientX, clientY, ZOOM_ANIMATION_MS);
      }, 0);
    },
    [isZoomed],
  );

  const handleTap = useTapZones({
    direction,
    onStep: step,
    onToggleUi,
    onDoubleTap: handleDoubleTap,
    isZoomed,
  });

  // At original size pages are usually wider than the screen: horizontal drags pan instead.
  const dragEnabled = fit.toPrimitive() !== 'original';

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.isPrimary) {
      drag.current = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: 'none',
        multiTouch: false,
        samples: [{ x: event.clientX, time: event.timeStamp }],
      };
    } else if (drag.current) {
      drag.current.multiTouch = true; // pinch: hand over to the zoom layer
      if (drag.current.axis === 'x') settle(0, 0);
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId || current.multiTouch) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (current.axis === 'none') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return;
      current.axis = Math.abs(dx) > Math.abs(dy) && dragEnabled && !isZoomed() ? 'x' : 'y';
      if (current.axis === 'x') animation.current?.cancel();
    }
    if (current.axis !== 'x') return;
    current.samples.push({ x: event.clientX, time: event.timeStamp });
    if (current.samples.length > 5) current.samples.shift();
    const hasNeighbour = targetFor(dx > 0 ? 'left' : 'right') !== null;
    setOffset(hasNeighbour ? dx : dx * EDGE_RESISTANCE);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    if (current.multiTouch) return;

    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (current.axis === 'x') {
      const first = current.samples[0];
      const last = current.samples[current.samples.length - 1];
      const velocity =
        first && last && last.time > first.time ? (last.x - first.x) / (last.time - first.time) : 0;
      const passed =
        Math.abs(dx) > width() * COMMIT_FRACTION || Math.abs(velocity) > COMMIT_VELOCITY;
      // Only commit when the release continues the drag (a flick back cancels).
      if (passed && Math.sign(velocity || dx) === Math.sign(dx)) {
        turn(dx > 0 ? 'left' : 'right', velocity);
      } else {
        settle(0, velocity);
      }
      return;
    }
    if (Math.hypot(dx, dy) <= TAP_MAX_TRAVEL_PX) {
      handleTap(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    }
  };

  const onPointerCancel = () => {
    if (drag.current?.axis === 'x') settle(0, 0);
    drag.current = null;
  };

  const fitClass =
    fit.toPrimitive() === 'width'
      ? styles.fitWidth
      : fit.toPrimitive() === 'original'
        ? styles.fitOriginal
        : styles.fitHeight;

  const renderSpread = (start: number | null, zoomable: boolean) => {
    if (start === null) return null;
    const pages = layout.spreadContaining(start);
    const contentClass = `${styles.spread} ${fitClass} ${pages.length > 1 ? styles.doubleSpread : ''}`;
    const images = direction.arrangeForDisplay(pages).map((page) => {
      const url = urls.get(page);
      return url ? (
        <img
          key={page}
          className={styles.page}
          src={url}
          alt={t('reader.pageAlt', { current: page + 1, total: pageCount })}
          draggable={false}
          onLoad={(event) =>
            onPageSize(page, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
          }
        />
      ) : (
        <p key={page} className={styles.status} role="status">
          {failed.has(page) ? t('reader.pageError') : t('reader.loadingPage')}
        </p>
      );
    });
    if (!zoomable) {
      return (
        <div className={styles.staticSpread} aria-hidden="true">
          <div className={contentClass}>{images}</div>
        </div>
      );
    }
    return (
      <TransformWrapper
        key={pages.join('-')}
        ref={zoom}
        minScale={1}
        maxScale={MAX_SCALE}
        limitToBounds
        centerZoomedOut
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }}
        wheel={{ step: 0.15 }}
      >
        <TransformComponent wrapperClass={styles.zoomWrapper} contentClass={contentClass}>
          {images}
        </TransformComponent>
      </TransformWrapper>
    );
  };

  return (
    <div
      ref={root}
      className={styles.pager}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div ref={track} className={styles.track}>
        <div className={styles.slot} style={{ left: '-100%' }}>
          {renderSpread(leftStart, false)}
        </div>
        <div className={styles.slot} style={{ left: 0 }} key={spread.join('-')}>
          {renderSpread(spread[0] ?? 0, true)}
        </div>
        <div className={styles.slot} style={{ left: '100%' }}>
          {renderSpread(rightStart, false)}
        </div>
      </div>
    </div>
  );
}
