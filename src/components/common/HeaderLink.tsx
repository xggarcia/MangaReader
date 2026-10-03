import { Link } from 'react-router';
import styles from './ScreenHeader.module.css';

interface HeaderLinkProps {
  to: string;
  label: string;
  icon: string;
}

/** Icon-only navigation action for the screen header; `label` is the accessible name. */
export function HeaderLink({ to, label, icon }: HeaderLinkProps) {
  return (
    <Link to={to} className={styles.action} aria-label={label}>
      <span aria-hidden="true">{icon}</span>
    </Link>
  );
}
