import { CircleCheck, Smartphone } from 'lucide-react';
import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../../i18n/formatBytes';
import { useDeviceTransferStore } from '../../stores/deviceTransferStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useSyncStore } from '../../stores/syncStore';
import library from '../library/Library.module.css';
import { Sheet } from '../ui/Sheet';
import styles from './Sync.module.css';

interface SendSheetProps {
  title: string;
  comicIds: readonly string[];
  /** When a whole collection is sent, it is recreated (or completed) on the other device. */
  collectionId?: string;
  onClose: () => void;
}

/**
 * Sends comics to a paired device on the same Wi-Fi: it says which ones it already has, and only
 * the missing ones travel.
 */
export function SendSheet({ title, comicIds, collectionId, onClose }: SendSheetProps) {
  const { t, i18n } = useTranslation();
  const sheetId = useId();
  const peers = useSyncStore((state) => state.peers);
  const items = useLibraryStore((state) => state.items);
  const outgoing = useDeviceTransferStore((state) => state.outgoing);
  const transfer = useDeviceTransferStore.getState();
  const bytes = (value: number) => formatBytes(value, i18n.language);

  useEffect(() => {
    void useSyncStore.getState().init();
  }, []);

  // Cover-only comics have no file to send.
  const comics = comicIds.flatMap((id) => {
    const comic = items.findById(id)?.getComic();
    return comic && !comic.isArchived() ? [comic] : [];
  });
  const size = comics.reduce((total, comic) => total + comic.getStoredSize(), 0);

  let body;
  switch (outgoing.status) {
    case 'idle':
      body = (
        <>
          <p className={library.infoHint}>
            {t('transfer.summary', { count: comics.length, size: bytes(size) })}
          </p>
          {peers.length === 0 ? (
            <p className={library.infoHint}>{t('deviceSend.noPeers')}</p>
          ) : (
            <>
              <p className={library.infoHint}>{t('deviceSend.chooseDevice')}</p>
              <div className={library.choiceList}>
                {peers.map((peer) => (
                  <button
                    key={peer.id}
                    type="button"
                    className={styles.deviceRow}
                    disabled={comics.length === 0}
                    onClick={() =>
                      void transfer.send(
                        peer,
                        comics.map((comic) => comic.getId()),
                        collectionId,
                      )
                    }
                  >
                    <Smartphone size={22} strokeWidth={1.9} aria-hidden />
                    <span>{peer.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      );
      break;
    case 'connecting':
      body = (
        <div className={styles.searching} role="status">
          <span className={library.spinner} aria-hidden="true" />
          {t('deviceSend.connecting', { name: outgoing.peer.name })}
        </div>
      );
      break;
    case 'transferring': {
      const { progress, peer } = outgoing;
      body =
        progress.phase === 'checking' ? (
          <div className={styles.searching} role="status">
            <span className={library.spinner} aria-hidden="true" />
            {t('deviceSend.checking', { name: peer.name })}
          </div>
        ) : (
          <div className={library.transferStatus} role="status">
            <span>
              {t('deviceSend.sending', {
                current: Math.min(progress.done + 1, progress.total),
                total: progress.total,
                name: peer.name,
              })}
            </span>
            <span className={library.hudDetail}>
              {progress.title} · {bytes(progress.bytesDone)} / {bytes(progress.bytesTotal)}
            </span>
            <span className={library.importBar} aria-hidden="true">
              <span
                style={{
                  width: `${progress.bytesTotal > 0 ? (progress.bytesDone / progress.bytesTotal) * 100 : 0}%`,
                }}
              />
            </span>
            {progress.alreadyThere > 0 && (
              <span className={library.hudDetail}>
                {t('deviceSend.alreadyThere', { count: progress.alreadyThere })}
              </span>
            )}
          </div>
        );
      break;
    }
    case 'done': {
      const { result, peer } = outgoing;
      body = (
        <div className={library.transferStatus} role="status">
          <strong>
            <CircleCheck size={20} strokeWidth={2} aria-hidden className={library.hudDone} />{' '}
            {result.sent > 0
              ? t('deviceSend.sent', { count: result.sent, name: peer.name })
              : t('deviceSend.nothingMissing', { name: peer.name })}
          </strong>
          {result.alreadyThere > 0 && (
            <span className={library.hudDetail}>
              {t('deviceSend.alreadyThere', { count: result.alreadyThere })}
            </span>
          )}
          {(result.failed > 0 || result.interrupted) && (
            <span className={library.formError}>
              {result.interrupted
                ? t('deviceSend.interrupted')
                : t('deviceSend.failedCount', { count: result.failed })}
            </span>
          )}
        </div>
      );
      break;
    }
    case 'failed':
      body = (
        <p className={library.formError} role="alert">
          {t(`deviceSend.failed.${outgoing.reason}`, { name: outgoing.peer.name })}
        </p>
      );
      break;
  }

  return (
    <Sheet
      id={sheetId}
      title={title}
      closeLabel={t('transfer.close')}
      autoOpen
      onClose={() => {
        transfer.resetOutgoing();
        onClose();
      }}
    >
      <div className={library.infoForm}>{body}</div>
    </Sheet>
  );
}
