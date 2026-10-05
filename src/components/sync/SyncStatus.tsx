import { RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOptimizationStore } from '../../stores/optimizationStore';
import { useSyncStore } from '../../stores/syncStore';
import library from '../library/Library.module.css';

/** Brief capsule after a sync brought changes from another device. */
export function SyncStatus() {
  const { t } = useTranslation();
  const result = useSyncStore((state) => state.lastResult);
  // Sits above the reduce-size capsule when both are showing.
  const optimizing = useOptimizationStore(
    (state) => state.current !== null || state.summary !== null,
  );

  return (
    <div
      className={`${library.importHud} ${library.optimizeHud}`}
      data-visible={result !== null}
      data-raised={optimizing}
      role="status"
    >
      {result && (
        <>
          <RefreshCw size={20} strokeWidth={2} aria-hidden className={library.installIcon} />
          <span className={library.hudText}>
            <span>{t('sync.syncedWith', { name: result.peerName })}</span>
            <span className={library.hudDetail}>
              {t('sync.changes', { count: result.changed })}
            </span>
          </span>
          <button
            type="button"
            className={`${library.dismiss} ${library.hudButton}`}
            aria-label={t('library.dismiss')}
            onClick={() => useSyncStore.getState().dismissResult()}
          >
            <X size={18} strokeWidth={2.2} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
