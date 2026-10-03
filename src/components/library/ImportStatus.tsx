import { AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ImportProgress } from '../../modules/library/application/importComics';
import type { ImportFailure } from '../../stores/libraryStore';
import styles from './Library.module.css';

interface ImportStatusProps {
  progress: ImportProgress | null;
  failures: ImportFailure[];
  onDismiss: () => void;
}

/** Floating progress capsule while importing, and a dismissible summary of failed files. */
export function ImportStatus({ progress, failures, onDismiss }: ImportStatusProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className={styles.importHud} data-visible={progress !== null} role="status">
        {progress && (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span>{t('library.importing', { done: progress.done, total: progress.total })}</span>
            <span className={styles.importBar} aria-hidden="true">
              <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </span>
          </>
        )}
      </div>
      {failures.length > 0 && (
        <section className={styles.importErrors} role="alert">
          <div className={styles.noticeHeader}>
            <AlertCircle size={20} strokeWidth={2} aria-hidden className={styles.importErrorIcon} />
            <h2>{t('library.importFailedTitle', { count: failures.length })}</h2>
            <button
              type="button"
              className={styles.dismiss}
              aria-label={t('library.dismiss')}
              onClick={onDismiss}
            >
              <X size={18} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
          <ul>
            {failures.map((failure, index) => (
              <li key={`${failure.fileName}-${index}`}>
                <span className={styles.failedName}>{failure.fileName}</span>
                <span className={styles.failedReason}>{t(`errors.${failure.code}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
