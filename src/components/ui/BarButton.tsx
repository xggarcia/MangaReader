import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Controls.module.css';

interface BarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; required because bar buttons are icon-only. */
  label: string;
  children: ReactNode;
}

/** Icon-only navigation bar button in the accent colour, iOS style. */
export function BarButton({ label, children, className, ...props }: BarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`${styles.barButton} ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  );
}
