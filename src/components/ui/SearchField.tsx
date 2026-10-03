import { Search, X } from 'lucide-react';
import { useRef } from 'react';
import styles from './Controls.module.css';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  clearLabel: string;
}

/** iOS search field: filled capsule with a magnifier and a clear button while typing. */
export function SearchField({ value, onChange, placeholder, label, clearLabel }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.search}>
      <Search className={styles.searchIcon} size={17} strokeWidth={2} aria-hidden />
      <input
        ref={input}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          className={styles.searchClear}
          aria-label={clearLabel}
          onClick={() => {
            onChange('');
            input.current?.focus();
          }}
        >
          <X size={12} strokeWidth={3} aria-hidden />
        </button>
      )}
    </div>
  );
}
