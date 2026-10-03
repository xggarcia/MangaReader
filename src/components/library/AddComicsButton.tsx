import { useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Library.module.css';

interface AddComicsButtonProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Icon-only button for the header. */
  compact?: boolean;
}

/**
 * Opens the system file picker (several files at once). No `accept` filter on purpose: Android
 * maps it to MIME types and CBZ/CBR files often have none, so they would be hidden. Formats are
 * validated by content when importing.
 */
export function AddComicsButton({
  onFiles,
  disabled = false,
  compact = false,
}: AddComicsButtonProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) onFiles(files);
  };

  return (
    <>
      <button
        type="button"
        className={compact ? styles.iconButton : styles.primaryButton}
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label={compact ? t('library.add') : undefined}
      >
        {compact ? <span aria-hidden="true">＋</span> : t('library.add')}
      </button>
      <input ref={inputRef} type="file" multiple hidden tabIndex={-1} onChange={handleChange} />
    </>
  );
}
