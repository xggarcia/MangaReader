import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import styles from './CoverContextMenu.module.css';

export interface ContextAction {
  id: string;
  label: string;
  icon: LucideIcon;
  destructive?: boolean;
  onSelect: () => void;
}

interface CoverContextMenuProps {
  /** Screen rectangle of the cover being lifted. */
  anchor: DOMRect;
  coverUrl: string | null;
  title: string;
  subtitle: string;
  actions: readonly ContextAction[];
  /** Accessible name of the invisible backdrop that closes the menu. */
  dismissLabel: string;
  onClose: () => void;
}

const MARGIN = 16;
const GAP = 12;
const SPRING =
  'linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50%, 1.015 55%, 1.017 63.9%, 1.001 85%, 1)';

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * iOS haptic-touch menu: the cover lifts out of the grid onto a blurred backdrop and an action
 * menu appears next to it. Closing plays the lift in reverse back into the grid.
 */
export function CoverContextMenu({
  anchor,
  coverUrl,
  title,
  subtitle,
  actions,
  dismissLabel,
  onClose,
}: CoverContextMenuProps) {
  const overlay = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  const flipFromAnchor = useCallback((): Keyframe => {
    const element = preview.current;
    if (!element) return {};
    const target = element.getBoundingClientRect();
    return {
      transform: `translate(${anchor.left - target.left}px, ${anchor.top - target.top}px) scale(${anchor.width / target.width})`,
      boxShadow: 'none',
    };
  }, [anchor]);

  useLayoutEffect(() => {
    const element = overlay.current;
    const previewElement = preview.current;
    const menuElement = menu.current;
    if (!element || !previewElement || !menuElement) return;
    element.showPopover();

    // Lay out: preview near its original spot, menu below (or above when there is no room).
    const width = Math.min(window.innerWidth * 0.5, 220);
    const height = width * 1.5;
    const menuHeight = menuElement.offsetHeight;
    const left = Math.min(
      Math.max(MARGIN, anchor.left + anchor.width / 2 - width / 2),
      window.innerWidth - width - MARGIN,
    );
    const maxTop = window.innerHeight - MARGIN - menuHeight - GAP - height;
    const top = Math.min(Math.max(MARGIN + 24, anchor.top - (height - anchor.height) / 2), maxTop);
    previewElement.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px`;
    const menuWidth = Math.min(280, window.innerWidth - MARGIN * 2);
    const menuLeft = Math.min(Math.max(MARGIN, left), window.innerWidth - menuWidth - MARGIN);
    menuElement.style.cssText = `left:${menuLeft}px;top:${top + height + GAP}px;width:${menuWidth}px`;

    // Keyboard and screen-reader users land on the first action.
    menuElement
      .querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });

    if (reducedMotion()) return;
    previewElement.animate([flipFromAnchor(), { transform: 'none' }], {
      duration: 520,
      easing: SPRING,
    });
    menuElement.animate(
      [
        { opacity: 0, transform: 'scale(0.7)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 420, easing: SPRING, delay: 40, fill: 'backwards' },
    );
  }, [anchor, flipFromAnchor]);

  const close = useCallback(
    (after?: () => void) => {
      if (closing.current) return;
      closing.current = true;
      const finish = () => {
        overlay.current?.hidePopover();
        onClose();
        after?.();
      };
      const previewElement = preview.current;
      if (reducedMotion() || !previewElement || !menu.current) {
        finish();
        return;
      }
      if (styles.closing) overlay.current?.classList.add(styles.closing);
      menu.current.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.8)' }], {
        duration: 160,
        fill: 'forwards',
      });
      previewElement
        .animate([{ transform: 'none' }, flipFromAnchor()], {
          duration: 300,
          easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
          fill: 'forwards',
        })
        .finished.then(finish, finish);
    },
    [flipFromAnchor, onClose],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close]);

  return (
    <div
      ref={overlay}
      popover="manual"
      role="dialog"
      aria-label={title}
      className={styles.overlay}
      onToggle={(event) => {
        // Closed from outside (Android Back): keep the parent in sync.
        if (event.newState === 'closed' && !closing.current) {
          closing.current = true;
          onClose();
        }
      }}
    >
      <button
        type="button"
        className={styles.backdrop}
        aria-label={dismissLabel}
        tabIndex={-1}
        onClick={() => close()}
      />
      <div ref={preview} className={styles.preview}>
        {coverUrl ? (
          <img src={coverUrl} alt="" draggable={false} />
        ) : (
          <span className={styles.placeholder}>{title.slice(0, 1)}</span>
        )}
      </div>
      <div ref={menu} className={styles.menu} role="menu" aria-label={title}>
        <div className={styles.menuHeader}>
          <p className={styles.menuTitle}>{title}</p>
          <p className={styles.menuSubtitle}>{subtitle}</p>
        </div>
        {actions.map(({ id, label, icon: Icon, destructive, onSelect }) => (
          <button
            key={id}
            type="button"
            role="menuitem"
            className={`${styles.action} ${destructive ? styles.destructive : ''}`}
            onClick={() => close(onSelect)}
          >
            <span>{label}</span>
            <Icon size={19} strokeWidth={1.9} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
