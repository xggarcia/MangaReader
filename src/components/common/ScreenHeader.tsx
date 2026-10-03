import type { ReactNode } from 'react';
import styles from './ScreenHeader.module.css';

interface ScreenHeaderProps {
  title: string;
  start?: ReactNode;
  end?: ReactNode;
}

export function ScreenHeader({ title, start, end }: ScreenHeaderProps) {
  return (
    <header className={styles.header}>
      {start}
      <h1 className={styles.title}>{title}</h1>
      {end}
    </header>
  );
}
