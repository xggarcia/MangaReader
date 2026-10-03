import type { LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router';
import { goTo } from '../../app/navigation';
import { haptics } from '../../shared/infrastructure/haptics';
import styles from './TabBar.module.css';

export interface TabItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface TabBarProps {
  tabs: readonly TabItem[];
  label: string;
}

/** iOS tab bar: translucent material, icon over label, accent tint on the active tab. */
export function TabBar({ tabs, label }: TabBarProps) {
  const { pathname } = useLocation();

  return (
    <nav className={styles.bar} aria-label={label}>
      {tabs.map(({ path, label: tabLabel, icon: Icon }) => {
        const active = path === pathname;
        return (
          <a
            key={path}
            href={`#${path}`}
            className={styles.tab}
            aria-current={active ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              if (active) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              haptics.selection();
              goTo(path, 'tab', { replace: true });
            }}
          >
            <Icon
              className={styles.icon}
              size={25}
              strokeWidth={active ? 2.1 : 1.75}
              // Selected tabs read as filled, like iOS, without hiding the glyph's inner lines.
              fill={active ? 'currentColor' : 'none'}
              fillOpacity={active ? 0.22 : 0}
              aria-hidden
            />
            <span className={styles.label}>{tabLabel}</span>
          </a>
        );
      })}
    </nav>
  );
}
