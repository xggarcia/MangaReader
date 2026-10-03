import { ChevronRight, ChevronsUpDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Menu, type MenuItem } from './Menu';
import styles from './GroupedList.module.css';

interface GroupedSectionProps {
  title?: string;
  footer?: string;
  children: ReactNode;
}

/** Inset grouped list section: rounded card on the grouped background, hairline separators. */
export function GroupedSection({ title, footer, children }: GroupedSectionProps) {
  return (
    <section className={styles.section}>
      {title && <h2 className={styles.sectionTitle}>{title}</h2>}
      <div className={styles.group}>{children}</div>
      {footer && <p className={styles.footer}>{footer}</p>}
    </section>
  );
}

interface RowProps {
  icon?: LucideIcon;
  /** Background of the rounded icon square (iOS settings style). */
  iconColor?: string;
  label: string;
  children?: ReactNode;
}

/** A static row: icon, label and trailing content. */
export function Row({ icon: Icon, iconColor, label, children }: RowProps) {
  return (
    <div className={styles.row}>
      {Icon && (
        <span className={styles.rowIcon} style={{ background: iconColor }} aria-hidden="true">
          <Icon size={18} strokeWidth={2} />
        </span>
      )}
      <span className={styles.rowLabel}>{label}</span>
      {children && <span className={styles.rowTrailing}>{children}</span>}
    </div>
  );
}

interface MenuRowProps<T extends string> {
  icon?: LucideIcon;
  iconColor?: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Row whose value opens an iOS pull-down menu with a checkmark on the current option. */
export function MenuRow<T extends string>({
  icon,
  iconColor,
  label,
  value,
  options,
  onChange,
}: MenuRowProps<T>) {
  const current = options.find((option) => option.value === value);
  const items: MenuItem[] = options.map((option) => ({
    id: option.value,
    label: option.label,
    checked: option.value === value,
    onSelect: () => onChange(option.value),
  }));

  return (
    <Row icon={icon} iconColor={iconColor} label={label}>
      <Menu
        label={label}
        items={items}
        trigger={(triggerProps) => (
          <button
            type="button"
            className={styles.menuValue}
            aria-label={`${label}: ${current?.label ?? ''}`}
            {...triggerProps}
          >
            <span>{current?.label}</span>
            <ChevronsUpDown size={15} strokeWidth={2} aria-hidden />
          </button>
        )}
      />
    </Row>
  );
}

interface LinkRowProps {
  icon?: LucideIcon;
  iconColor?: string;
  label: string;
  detail?: string;
  onClick: () => void;
}

/** Tappable row with a trailing value and a chevron, opening another screen. */
export function LinkRow({ icon: Icon, iconColor, label, detail, onClick }: LinkRowProps) {
  return (
    <button type="button" className={`${styles.row} ${styles.linkRow}`} onClick={onClick}>
      {Icon && (
        <span className={styles.rowIcon} style={{ background: iconColor }} aria-hidden="true">
          <Icon size={18} strokeWidth={2} />
        </span>
      )}
      <span className={styles.rowLabel}>{label}</span>
      {detail && <span className={styles.rowTrailing}>{detail}</span>}
      <ChevronRight size={18} strokeWidth={2.2} aria-hidden className={styles.chevron} />
    </button>
  );
}
