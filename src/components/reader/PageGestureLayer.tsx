import { useRef, type PointerEvent, type ReactNode } from 'react';
import { useTapZones } from '../../hooks/useTapZones';
import type { PageStep, ReadingDirection } from '../../modules/reading/domain/ReadingDirection';
import styles from './Reader.module.css';

const TAP_MAX_TRAVEL_PX = 10;

interface PageGestureLayerProps {
  direction: ReadingDirection;
  onStep: (step: PageStep) => void;
  onToggleUi: () => void;
  children: ReactNode;
}

/**
 * Tap navigation for the vertical (webtoon) reader. Scrolling stays native (`pan-y`); a tap on
 * the sides scrolls by a screen, a centre tap toggles the UI.
 */
export function PageGestureLayer({
  direction,
  onStep,
  onToggleUi,
  children,
}: PageGestureLayerProps) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const handleTap = useTapZones({ direction, onStep, onToggleUi });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const origin = start.current;
    start.current = null;
    if (!origin || origin.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > TAP_MAX_TRAVEL_PX) return;
    handleTap(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
  };

  return (
    <div
      className={styles.gestureLayer}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
    >
      {children}
    </div>
  );
}
