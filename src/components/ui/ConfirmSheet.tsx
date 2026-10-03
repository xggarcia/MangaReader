import { useEffect, useId, useRef } from 'react';
import styles from './Controls.module.css';

interface ConfirmSheetProps {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  /** Called whenever the sheet closes (confirmed, cancelled, Back or tap outside). */
  onClose: () => void;
}

/**
 * iOS action sheet for confirmations: a grouped card with the question and the action, and a
 * separate Cancel button, sliding up from the bottom over a dimmed page.
 */
export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const confirmed = useRef(false);

  useEffect(() => {
    const element = sheet.current;
    element?.showPopover();
    // Focus the dialog itself: screen readers announce it and no focus ring flashes on touch.
    element?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={sheet}
      popover="auto"
      role="alertdialog"
      tabIndex={-1}
      aria-labelledby={titleId}
      className={styles.actionSheet}
      onToggle={(event) => {
        if (event.newState !== 'closed') return;
        if (confirmed.current) onConfirm();
        onClose();
      }}
    >
      <div className={styles.actionGroup}>
        <div className={styles.actionHeader}>
          <p id={titleId} className={styles.actionTitle}>
            {title}
          </p>
          {message && <p className={styles.actionMessage}>{message}</p>}
        </div>
        <button
          type="button"
          className={`${styles.actionButton} ${destructive ? styles.destructive : ''}`}
          onClick={() => {
            confirmed.current = true;
            sheet.current?.hidePopover();
          }}
        >
          {confirmLabel}
        </button>
      </div>
      <button
        type="button"
        className={`${styles.actionGroup} ${styles.actionButton} ${styles.actionCancel}`}
        onClick={() => sheet.current?.hidePopover()}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
