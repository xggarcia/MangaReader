import { CircleCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransferStore, type ImportState } from '../../stores/transferStore';
import { Sheet } from '../ui/Sheet';
import styles from './Library.module.css';

/**
 * Progress and result of importing a library exported on another device. Shown wherever the
 * import started (comics folder, picker, a file opened with the app).
 */
export function ImportLibrarySheet() {
  const status = useTransferStore((state) => state.importing.status);
  if (status === 'idle') return null;
  // Remounting on each status change reopens the sheet, e.g. for the result after the user
  // closed it while the import was running.
  return <ImportLibraryContent key={status} />;
}

function ImportLibraryContent() {
  const { t } = useTranslation();
  const sheetId = useId();
  const importing = useTransferStore((state) => state.importing);
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <Sheet
      id={sheetId}
      title={t('transfer.importTitle')}
      closeLabel={t('transfer.close')}
      autoOpen
      onClose={() => {
        setOpen(false);
        useTransferStore.getState().resetImport();
      }}
    >
      <div className={styles.infoForm}>
        <div className={styles.transferStatus} role="status">
          <ImportStatusText importing={importing} />
        </div>
      </div>
    </Sheet>
  );
}

function ImportStatusText({ importing }: { importing: ImportState }) {
  const { t } = useTranslation();
  if (importing.status === 'running') {
    const ratio = importing.total > 0 ? importing.done / importing.total : 0;
    return (
      <>
        <span>
          {importing.total > 0
            ? t('transfer.importing', { done: importing.done, total: importing.total })
            : t('transfer.importStarting')}
        </span>
        <span className={styles.importBar} aria-hidden="true">
          <span style={{ width: `${ratio * 100}%` }} />
        </span>
      </>
    );
  }
  if (importing.status === 'done') {
    const { imported, skipped } = importing.result;
    return (
      <>
        <strong>
          <CircleCheck size={20} strokeWidth={2} aria-hidden className={styles.hudDone} />{' '}
          {t('transfer.importDone', { count: imported })}
        </strong>
        {skipped > 0 && (
          <span className={styles.hudDetail}>
            {t('transfer.importSkipped', { count: skipped })}
          </span>
        )}
      </>
    );
  }
  if (importing.status === 'error') {
    return (
      <span role="alert">
        {t('transfer.failed')}: {t(`errors.${importing.code}`)}
      </span>
    );
  }
  return null;
}
