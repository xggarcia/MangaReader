import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDeviceTransferStore } from '../../stores/deviceTransferStore';
import library from '../library/Library.module.css';

/** Capsule while comics arrive from a paired device, then a short summary. */
export function ReceiveStatus() {
  const { t } = useTranslation();
  const incoming = useDeviceTransferStore((state) => state.incoming);

  let content = null;
  if (incoming.status === 'receiving') {
    const { progress } = incoming;
    content = (
      <>
        <span className={library.spinner} aria-hidden="true" />
        <span className={library.hudText}>
          <span>
            {progress.total > 0
              ? t('deviceSend.receiving', {
                  current: Math.min(progress.done + 1, progress.total),
                  total: progress.total,
                  name: incoming.peerName,
                })
              : t('deviceSend.receivingFrom', { name: incoming.peerName })}
          </span>
          {progress.title && <span className={library.hudDetail}>{progress.title}</span>}
        </span>
        <span />
        <span className={library.importBar} aria-hidden="true">
          <span
            style={{
              width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
            }}
          />
        </span>
      </>
    );
  } else if (incoming.status === 'done') {
    content = (
      <>
        <Download size={20} strokeWidth={2} aria-hidden className={library.hudDone} />
        <span className={library.hudText}>
          <span>
            {t('deviceSend.received', {
              count: incoming.result.received,
              name: incoming.peerName,
            })}
          </span>
          {incoming.result.failed > 0 && (
            <span className={library.hudDetail}>
              {t('deviceSend.failedCount', { count: incoming.result.failed })}
            </span>
          )}
        </span>
        <button
          type="button"
          className={`${library.dismiss} ${library.hudButton}`}
          aria-label={t('library.dismiss')}
          onClick={() => useDeviceTransferStore.getState().dismissIncoming()}
        >
          <X size={18} strokeWidth={2.2} aria-hidden />
        </button>
      </>
    );
  }

  return (
    <div
      className={`${library.importHud} ${library.optimizeHud}`}
      data-visible={incoming.status !== 'idle'}
      role="status"
    >
      {content}
    </div>
  );
}
