import { useTranslation } from 'react-i18next';
import type { ImportProgress } from '../../modules/library/application/importComics';
import type { ImportFailure } from '../../stores/libraryStore';
import styles from './Library.module.css';

interface ImportStatusProps {
  progress: ImportProgress | null;
  failures: ImportFailure[];
  onDismiss: () => void;
}

export function ImportStatus({ progress, failures, onDismiss }: ImportStatusProps) {
  const { t } = useTranslation();
  return (
    <>
      <p className={progress ? styles.importProgress : 'visually-hidden'} role="status">
        {progress ? t('library.importing', { done: progress.done, total: progress.total }) : ''}
      </p>
      {failures.length > 0 && (
        <section className={styles.importErrors} role="alert">
          <div className={styles.importErrorsHeader}>
            <h2>{t('library.importFailedTitle', { count: failures.length })}</h2>
            <button type="button" className={styles.textButton} onClick={onDismiss}>
              {t('library.dismiss')}
            </button>
          </div>
          <ul>
            {failures.map((failure, index) => (
              <li key={`${failure.fileName}-${index}`}>
                <strong>{failure.fileName}</strong>: {t(`errors.${failure.code}`)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
