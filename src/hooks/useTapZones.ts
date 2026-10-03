import { useCallback, useEffect, useRef } from 'react';
import type {
  PageStep,
  ReadingDirection,
  ScreenSide,
} from '../modules/reading/domain/ReadingDirection';

/** Fraction of the width on each side that turns pages when tapped. */
const SIDE_ZONE = 0.3;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 40;

export type TapZone = ScreenSide | 'center';

interface TapZonesOptions {
  direction: ReadingDirection;
  onStep: (step: PageStep) => void;
  onToggleUi: () => void;
  /** Enables double tap (centre, or anywhere while zoomed). */
  onDoubleTap?: (clientX: number, clientY: number) => void;
  isZoomed?: () => boolean;
}

/**
 * Tap handling shared by the paged and vertical readers: side taps turn pages immediately, a
 * centre tap toggles the UI (waiting briefly for a possible double tap), and double tap zooms.
 */
export function useTapZones({
  direction,
  onStep,
  onToggleUi,
  onDoubleTap,
  isZoomed,
}: TapZonesOptions): (clientX: number, clientY: number, bounds: DOMRect) => void {
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (x: number, y: number, bounds: DOMRect) => {
      const relativeX = (x - bounds.left) / bounds.width;
      const zone: TapZone =
        relativeX < SIDE_ZONE ? 'left' : relativeX > 1 - SIDE_ZONE ? 'right' : 'center';
      const zoomed = isZoomed?.() ?? false;
      const now = performance.now();
      const canDoubleTap = onDoubleTap !== undefined && (zoomed || zone === 'center');
      const previous = lastTap.current;

      if (
        canDoubleTap &&
        previous &&
        now - previous.time < DOUBLE_TAP_MS &&
        Math.hypot(x - previous.x, y - previous.y) < DOUBLE_TAP_MAX_DISTANCE_PX
      ) {
        if (timer.current) clearTimeout(timer.current);
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

      lastTap.current = { x, y, time: now };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        lastTap.current = null;
        if (zone === 'center') onToggleUi();
      }, DOUBLE_TAP_MS);
    },
    [direction, onStep, onToggleUi, onDoubleTap, isZoomed],
  );
}
