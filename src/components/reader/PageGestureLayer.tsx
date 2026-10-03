import { useRef, type PointerEvent, type ReactNode } from 'react';
import type { PageStep, ReadingDirection } from '../../modules/reading/domain/ReadingDirection';
import styles from './Reader.module.css';

/** Fraction of the width on each side that turns pages when tapped. */
const SIDE_ZONE = 0.3;
const TAP_MAX_TRAVEL_PX = 10;

interface PageGestureLayerProps {
  direction: ReadingDirection;
  onStep: (step: PageStep) => void;
  onToggleUi: () => void;
  children: ReactNode;
}

/**
 * Touch/mouse navigation: tap on the sides turns pages, tap in the centre toggles the UI and a
 * horizontal swipe turns pages. Keyboard users get the same actions from useReaderKeyboard.
 */
export function PageGestureLayer({
  direction,
  onStep,
  onToggleUi,
  children,
}: PageGestureLayerProps) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const origin = start.current;
    start.current = null;
    if (!origin || origin.id !== event.pointerId) return;

    const deltaX = event.clientX - origin.x;
    const deltaY = event.clientY - origin.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const swipeStep = direction.stepForSwipe(deltaX);
      if (swipeStep) {
        onStep(swipeStep);
        return;
      }
    }
    if (Math.hypot(deltaX, deltaY) > TAP_MAX_TRAVEL_PX) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    if (relativeX < SIDE_ZONE) onStep(direction.stepForSide('left'));
    else if (relativeX > 1 - SIDE_ZONE) onStep(direction.stepForSide('right'));
    else onToggleUi();
  };

  return (
    <div
      className={styles.gestureLayer}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => (start.current = null)}
    >
      {children}
    </div>
  );
}
