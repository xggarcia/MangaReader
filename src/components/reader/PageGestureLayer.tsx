import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import type {
  PageStep,
  ReadingDirection,
  ScreenSide,
} from '../../modules/reading/domain/ReadingDirection';
import styles from './Reader.module.css';

/** Fraction of the width on each side that turns pages when tapped. */
const SIDE_ZONE = 0.3;
const TAP_MAX_TRAVEL_PX = 10;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 40;

type TapZone = ScreenSide | 'center';

interface PageGestureLayerProps {
  direction: ReadingDirection;
  onStep: (step: PageStep) => void;
  onToggleUi: () => void;
  /** Enables double tap (centre, or anywhere while zoomed). Coordinates are client pixels. */
  onDoubleTap?: (clientX: number, clientY: number) => void;
  /** While zoomed, swipes pan the page and side taps do nothing. */
  isZoomed?: () => boolean;
  swipeEnabled?: boolean;
  /** `pan-y` keeps native vertical scrolling (webtoon); `none` hands gestures to the zoom layer. */
  touchAction?: 'none' | 'pan-y';
  children: ReactNode;
}

/**
 * Touch/mouse navigation: side taps turn pages immediately, a centre tap toggles the UI, a
 * horizontal swipe turns pages and a double tap zooms. Keyboard users get the same actions
 * from useReaderKeyboard.
 */
export function PageGestureLayer({
  direction,
  onStep,
  onToggleUi,
  onDoubleTap,
  isZoomed = () => false,
  swipeEnabled = true,
  touchAction = 'none',
  children,
}: PageGestureLayerProps) {
  const gesture = useRef<{ x: number; y: number; id: number; multiTouch: boolean } | null>(null);
  const activePointers = useRef(new Set<number>());
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    [],
  );

  const clearPendingTap = () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = null;
  };

  const handleTap = (x: number, y: number, zone: TapZone) => {
    const zoomed = isZoomed();
    const now = performance.now();
    const canDoubleTap = onDoubleTap !== undefined && (zoomed || zone === 'center');
    const previous = lastTap.current;

    if (
      canDoubleTap &&
      previous &&
      now - previous.time < DOUBLE_TAP_MS &&
      Math.hypot(x - previous.x, y - previous.y) < DOUBLE_TAP_MAX_DISTANCE_PX
    ) {
      clearPendingTap();
      lastTap.current = null;
      onDoubleTap(x, y);
      return;
    }

    if (zone !== 'center' && !zoomed) {
      lastTap.current = null;
      onStep(direction.stepForSide(zone));
      return;
    }

    if (!canDoubleTap) {
      if (zone === 'center') onToggleUi();
      return;
    }

    // Wait to see whether a second tap follows before toggling the UI.
    lastTap.current = { x, y, time: now };
    clearPendingTap();
    tapTimer.current = setTimeout(() => {
      lastTap.current = null;
      if (zone === 'center') onToggleUi();
    }, DOUBLE_TAP_MS);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // A primary pointer starts a new gesture; drop pointers whose "up" happened elsewhere.
    if (event.isPrimary) activePointers.current.clear();
    activePointers.current.add(event.pointerId);
    if (activePointers.current.size > 1) {
      if (gesture.current) gesture.current.multiTouch = true;
      return;
    }
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      multiTouch: false,
    };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId);
    const origin = gesture.current;
    if (!origin || origin.id !== event.pointerId) return;
    gesture.current = null;
    if (origin.multiTouch) return; // pinch

    const deltaX = event.clientX - origin.x;
    const deltaY = event.clientY - origin.y;

    if (swipeEnabled && !isZoomed() && Math.abs(deltaX) > Math.abs(deltaY)) {
      const swipeStep = direction.stepForSwipe(deltaX);
      if (swipeStep) {
        onStep(swipeStep);
        return;
      }
    }
    if (Math.hypot(deltaX, deltaY) > TAP_MAX_TRAVEL_PX) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    const zone: TapZone =
      relativeX < SIDE_ZONE ? 'left' : relativeX > 1 - SIDE_ZONE ? 'right' : 'center';
    handleTap(event.clientX, event.clientY, zone);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId);
    gesture.current = null;
  };

  return (
    <div
      className={styles.gestureLayer}
      style={{ touchAction }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {children}
    </div>
  );
}
