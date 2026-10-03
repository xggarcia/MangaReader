import { useRef, type PointerEvent, type ReactNode } from 'react';
import styles from './Controls.module.css';

interface SheetProps {
  id: string;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.6; // px per ms

/**
 * iOS bottom sheet on the popover top layer: slides up with the sheet curve, dims the page,
 * and can be dragged down by its grabber or header to dismiss.
 */
export function Sheet({ id, title, closeLabel, children }: SheetProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; time: number; id: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Buttons in the header keep their click; capturing the pointer would swallow it.
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { y: event.clientY, time: performance.now(), id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (sheet.current) sheet.current.style.transition = 'none';
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId || !sheet.current) return;
    const delta = event.clientY - start.y;
    // Rubber band upwards, follow the finger downwards.
    const offset = delta < 0 ? delta / 4 : delta;
    sheet.current.style.transform = `translateY(${offset}px)`;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    drag.current = null;
    const element = sheet.current;
    if (!start || !element) return;
    const delta = event.clientY - start.y;
    const velocity = delta / Math.max(1, performance.now() - start.time);
    // Clearing the inline styles lets the stylesheet transition take over from where it is.
    element.style.transition = '';
    element.style.transform = '';
    if (delta > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) element.hidePopover();
  };

  return (
    <div
      ref={sheet}
      id={id}
      popover="auto"
      role="dialog"
      aria-label={title}
      className={styles.sheet}
    >
      <div
        className={styles.sheetHandleArea}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className={styles.grabber} aria-hidden="true" />
        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>{title}</h2>
          <button
            type="button"
            className={styles.sheetDone}
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            {closeLabel}
          </button>
        </div>
      </div>
      <div className={styles.sheetBody}>{children}</div>
    </div>
  );
}
