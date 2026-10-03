import { useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Library.module.css';

interface OpenFileButtonProps {
  onFileSelected: (file: File) => void;
}

/**
 * Opens the system file picker. No `accept` filter on purpose: Android maps it to MIME types and
 * CBZ/CBR files often have none, so they would be hidden. Formats are validated by content.
 */
export function OpenFileButton({ onFileSelected }: OpenFileButtonProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onFileSelected(file);
  };

  return (
    <>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={() => inputRef.current?.click()}
      >
        {t('library.openFile')}
      </button>
      <input ref={inputRef} type="file" hidden tabIndex={-1} onChange={handleChange} />
    </>
  );
}
