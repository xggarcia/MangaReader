import { Link2, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasLocalSync } from '../../shared/infrastructure/localSync';
import { useSyncStore } from '../../stores/syncStore';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { GroupedSection, LinkRow } from '../ui/GroupedList';
import { PairingSheet } from './PairingSheet';

function useRelativeTime(): (time: number | undefined) => string {
  const { t, i18n } = useTranslation();
  return (time) => {
    if (!time) return t('sync.never');
    const minutes = Math.round((time - Date.now()) / 60000);
    const format = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
    if (Math.abs(minutes) < 60) return format.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return format.format(hours, 'hour');
    return format.format(Math.round(hours / 24), 'day');
  };
}

/** Settings › Sync: paired devices (tap to forget) and pairing a new one. Android only. */
export function SyncSettingsSection() {
  const { t } = useTranslation();
  const peers = useSyncStore((state) => state.peers);
  const lastSyncAt = useSyncStore((state) => state.lastSyncAt);
  const [pairing, setPairing] = useState(false);
  const [forgetting, setForgetting] = useState<{ id: string; name: string } | null>(null);
  const relative = useRelativeTime();

  useEffect(() => {
    void useSyncStore.getState().init();
  }, []);

  if (!hasLocalSync()) return null;

  return (
    <>
      <GroupedSection title={t('sync.title')} footer={t('sync.footer')}>
        {peers.map((peer) => (
          <LinkRow
            key={peer.id}
            icon={Smartphone}
            iconColor="#30b0c7"
            label={peer.name}
            detail={t('sync.lastSync', { time: relative(lastSyncAt[peer.id]) })}
            onClick={() => setForgetting(peer)}
          />
        ))}
        <LinkRow
          icon={Link2}
          iconColor="#30b0c7"
          label={t('sync.pairDevice')}
          onClick={() => setPairing(true)}
        />
      </GroupedSection>
      {pairing && <PairingSheet onClose={() => setPairing(false)} />}
      {forgetting && (
        <ConfirmSheet
          title={t('sync.forgetConfirm', { name: forgetting.name })}
          confirmLabel={t('sync.forget')}
          cancelLabel={t('library.cancel')}
          destructive
          onConfirm={() => void useSyncStore.getState().unpair(forgetting.id)}
          onClose={() => setForgetting(null)}
        />
      )}
    </>
  );
}
