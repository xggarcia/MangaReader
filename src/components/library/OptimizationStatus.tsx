import { CircleCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../../i18n/formatBytes';
import { useLibraryStore } from '../../stores/libraryStore';
import { useOptimizationStore } from '../../stores/optimizationStore';
import styles from './Library.module.css';

/** Floating capsule while comics are being reduced, then a short summary of the space freed. */
export function OptimizationStatus() {
  const { t, i18n } = useTranslation();
  const current = useOptimizationStore((state) => state.current);
  const done = useOptimizationStore((state) => state.done);
  const total = useOptimizationStore((state) => state.total);
  const stopping = useOptimizationStore((state) => state.stopping);
  const summary = useOptimizationStore((state) => state.summary);
  const importing = useLibraryStore((state) => state.importProgress !== null);
  const { stop, dismissSummary } = useOptimizationStore.getState();

  const running = current !== null;
  const visible = running || summary !== null;
  const ratio = current && current.pages > 0 ? (done + current.page / current.pages) / total : 0;

  let content = null;
  if (current) {
    content = (
      <>
        <span className={styles.spinner} aria-hidden="true" />
        <span className={styles.hudText}>
          <span>{t('optimize.progress', { current: Math.min(done + 1, total), total })}</span>
          <span className={styles.hudDetail}>
            {stopping ? t('optimize.stopping') : current.title}
          </span>
        </span>
        <button
          type="button"
          className={`${styles.dismiss} ${styles.hudButton}`}
          aria-label={t('optimize.stop')}
          disabled={stopping}
          onClick={stop}
        >
          <X size={18} strokeWidth={2.2} aria-hidden />
        </button>
        <span className={styles.importBar} aria-hidden="true">
          <span style={{ width: `${Math.min(1, ratio) * 100}%` }} />
        </span>
      </>
    );
  } else if (summary) {
    const parts =
      summary.optimized === 0 && summary.failed === 0
        ? [t('optimize.summaryNothing')]
        : [
            summary.optimized > 0
              ? t('optimize.summaryOptimized', { count: summary.optimized })
              : null,
            summary.failed > 0 ? t('optimize.summaryFailed', { count: summary.failed }) : null,
          ].filter((part): part is string => part !== null);
    content = (
      <>
        <CircleCheck size={20} strokeWidth={2} aria-hidden className={styles.hudDone} />
        <span className={styles.hudText}>
          {summary.savedBytes > 0 && (
            <span>
              {t('optimize.summarySaved', { size: formatBytes(summary.savedBytes, i18n.language) })}
            </span>
          )}
          <span className={summary.savedBytes > 0 ? styles.hudDetail : undefined}>
            {parts.join(' · ')}
          </span>
        </span>
        <button
          type="button"
          className={`${styles.dismiss} ${styles.hudButton}`}
          aria-label={t('library.dismiss')}
          onClick={dismissSummary}
        >
          <X size={18} strokeWidth={2.2} aria-hidden />
        </button>
      </>
    );
  }

  return (
    <div
      className={`${styles.importHud} ${styles.optimizeHud}`}
      data-visible={visible}
      data-raised={importing}
      role="status"
    >
      {content}
    </div>
  );
}
