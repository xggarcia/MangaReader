import { Check, type LucideIcon } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { haptics } from '../../shared/infrastructure/haptics';
import styles from './Controls.module.css';

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  checked?: boolean;
  destructive?: boolean;
  /** Starts a new group: drawn with a thicker separator above, like iOS menus. */
  dividerBefore?: boolean;
  onSelect: () => void;
}

interface MenuProps {
  /** Renders the trigger; spread `triggerProps` on a button. */
  trigger: (triggerProps: { popoverTarget: string; 'aria-haspopup': 'menu' }) => ReactNode;
  items: readonly MenuItem[];
  label: string;
}

const GAP = 6;
const MARGIN = 8;

/**
 * iOS pull-down menu anchored to its trigger: springs out of the trigger's corner, rows with
 * leading checkmarks or trailing icons, light-dismiss and Android Back close it.
 */
export function Menu({ trigger, items, label }: MenuProps) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);

  const position = () => {
    const element = menu.current;
    const anchor = document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(id)}"]`);
    if (!element || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(260, window.innerWidth - MARGIN * 2);
    const alignRight = rect.left + rect.width / 2 > window.innerWidth / 2;
    const left = alignRight
      ? Math.max(MARGIN, rect.right - width)
      : Math.min(rect.left, window.innerWidth - width - MARGIN);
    const below = rect.bottom + GAP;
    const openUp = below + element.offsetHeight > window.innerHeight - MARGIN;
    element.style.width = `${width}px`;
    element.style.left = `${left}px`;
    element.style.top = openUp
      ? `${Math.max(MARGIN, rect.top - GAP - element.offsetHeight)}px`
      : `${below}px`;
    element.style.transformOrigin = `${alignRight ? 'right' : 'left'} ${openUp ? 'bottom' : 'top'}`;
  };

  return (
    <>
      {trigger({ popoverTarget: id, 'aria-haspopup': 'menu' })}
      <div
        ref={menu}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        className={styles.menu}
        onToggle={(event) => {
          if (event.newState === 'open') position();
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={item.checked}
              className={`${styles.menuItem} ${item.destructive ? styles.destructive : ''} ${item.dividerBefore ? styles.menuDivider : ''}`}
              onClick={() => {
                haptics.selection();
                menu.current?.hidePopover();
                item.onSelect();
              }}
            >
              <span className={styles.menuCheck} aria-hidden="true">
                {item.checked && <Check size={17} strokeWidth={2.4} />}
              </span>
              <span className={styles.menuLabel}>{item.label}</span>
              {Icon && <Icon size={19} strokeWidth={1.9} aria-hidden />}
            </button>
          );
        })}
      </div>
    </>
  );
}
