import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './LargeTitleScreen.module.css';

interface LargeTitleScreenProps {
  title: string;
  /** Buttons on the right of the navigation bar. */
  trailing?: ReactNode;
  /** Content right under the large title (e.g. a search field), scrolls with it. */
  header?: ReactNode;
  /** Leaves room for the tab bar. */
  withTabBar?: boolean;
  children: ReactNode;
}

/**
 * iOS large-title screen: the 34pt title scrolls away and the navigation bar turns into
 * translucent material with an inline title once it is gone.
 */
export function LargeTitleScreen({
  title,
  trailing,
  header,
  withTabBar = true,
  children,
}: LargeTitleScreenProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    // The sentinel sits under the large title; once it slides behind the bar, collapse.
    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(entry ? !entry.isIntersecting : false),
      { rootMargin: '-96px 0px 0px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`${styles.screen} ${withTabBar ? styles.withTabBar : ''}`}>
      <header className={styles.navBar} data-collapsed={collapsed}>
        <span className={styles.inlineTitle} aria-hidden="true">
          {title}
        </span>
        <div className={styles.trailing}>{trailing}</div>
      </header>
      <h1 className={styles.largeTitle}>{title}</h1>
      <div ref={sentinel} className={styles.sentinel} />
      {header && <div className={styles.header}>{header}</div>}
      <main className={styles.content}>{children}</main>
    </div>
  );
}
