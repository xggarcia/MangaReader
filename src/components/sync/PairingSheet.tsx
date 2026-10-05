import { CircleCheck, Smartphone } from 'lucide-react';
import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { haptics } from '../../shared/infrastructure/haptics';
import { useSyncStore } from '../../stores/syncStore';
import library from '../library/Library.module.css';
import controls from '../ui/Controls.module.css';
import { Sheet } from '../ui/Sheet';
import styles from './Sync.module.css';

/**
 * Pairs this device with another one on the same Wi-Fi: both open this sheet, one picks the other,
 * and both confirm they show the same 6-digit code (it proves nobody is in the middle).
 */
export function PairingSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const sheetId = useId();
  const pairing = useSyncStore((state) => state.pairing);
  const deviceName = useSyncStore((state) => state.deviceName);
  const sync = useSyncStore.getState();

  useEffect(() => {
    void useSyncStore.getState().startPairing();
    return () => {
      void useSyncStore.getState().stopPairing();
    };
  }, []);

  let body;
  switch (pairing.status) {
    case 'off':
    case 'searching':
      body = (
        <>
          <p className={library.infoHint}>{t('sync.pairingHint', { name: deviceName })}</p>
          {pairing.status === 'searching' && pairing.candidates.length > 0 ? (
            <div className={library.choiceList}>
              {pairing.candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={styles.deviceRow}
                  onClick={() => void sync.pairWith(candidate.id)}
                >
                  <Smartphone size={22} strokeWidth={1.9} aria-hidden />
                  <span>{candidate.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.searching} role="status">
              <span className={library.spinner} aria-hidden="true" />
              {t('sync.searching')}
            </div>
          )}
        </>
      );
      break;
    case 'connecting':
      body = (
        <div className={styles.searching} role="status">
          <span className={library.spinner} aria-hidden="true" />
          {t('sync.connecting')}
        </div>
      );
      break;
    case 'code':
      body = (
        <>
          <p className={library.infoHint}>{t('sync.compareCode', { name: pairing.peerName })}</p>
          <p className={styles.code} aria-label={pairing.code.split('').join(' ')}>
            {pairing.code.slice(0, 3)} {pairing.code.slice(3)}
          </p>
          {pairing.confirmed ? (
            <div className={styles.searching} role="status">
              <span className={library.spinner} aria-hidden="true" />
              {t('sync.waitingOther')}
            </div>
          ) : (
            <>
              <button
                type="button"
                className={controls.filledButton}
                onClick={() => {
                  haptics.success();
                  void sync.confirmPairing(true);
                }}
              >
                {t('sync.codesMatch')}
              </button>
              <button
                type="button"
                className={library.secondaryButton}
                onClick={() => void sync.confirmPairing(false)}
              >
                {t('sync.codesDiffer')}
              </button>
            </>
          )}
        </>
      );
      break;
    case 'paired':
      body = (
        <div className={library.transferStatus} role="status">
          <strong>
            <CircleCheck size={20} strokeWidth={2} aria-hidden className={library.hudDone} />{' '}
            {t('sync.pairedWith', { name: pairing.peerName })}
          </strong>
          <span className={library.hudDetail}>{t('sync.pairedDetail')}</span>
        </div>
      );
      break;
    case 'failed':
      body = (
        <>
          <p className={library.formError} role="alert">
            {t(`sync.failed.${pairing.reason}`, { defaultValue: t('sync.failed.unreachable') })}
          </p>
          <button
            type="button"
            className={controls.filledButton}
            onClick={() => void sync.startPairing()}
          >
            {t('sync.tryAgain')}
          </button>
        </>
      );
      break;
  }

  return (
    <Sheet
      id={sheetId}
      title={t('sync.pairTitle')}
      closeLabel={pairing.status === 'paired' ? t('transfer.close') : t('library.cancel')}
      autoOpen
      onClose={onClose}
    >
      <div className={library.infoForm}>{body}</div>
    </Sheet>
  );
}
