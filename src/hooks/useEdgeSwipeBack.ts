import { useEffect } from 'react';
import { goBack } from '../app/navigation';

const EDGE_PX = 24;
const TRIGGER_PX = 70;

/**
 * iOS "swipe from the left edge to go back" for pushed screens. iPhones have no back button, so
 * this is the expected way out of a series or collection; the pop transition plays on release.
 */
export function useEdgeSwipeBack(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; id: number } | null = null;

    const onDown = (event: PointerEvent) => {
      start =
        event.isPrimary && event.clientX <= EDGE_PX
          ? { x: event.clientX, y: event.clientY, id: event.pointerId }
          : null;
    };
    const onUp = (event: PointerEvent) => {
      const origin = start;
      start = null;
      if (!origin || origin.id !== event.pointerId) return;
      const dx = event.clientX - origin.x;
      const dy = Math.abs(event.clientY - origin.y);
      if (dx > TRIGGER_PX && dx > dy * 2) goBack();
    };
    const onCancel = () => {
      start = null;
    };

    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onCancel, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
    };
  }, [enabled]);
}
