import { CircleCheck, Send } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../../i18n/formatBytes';
import { haptics } from '../../shared/infrastructure/haptics';
import { useLibraryStore } from '../../stores/libraryStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTransferStore } from '../../stores/transferStore';
import controls from '../ui/Controls.module.css';
import { Sheet } from '../ui/Sheet';
import styles from './Library.module.css';

interface ExportSheetProps {
  title: string;
  /** Comics to export; the whole library when omitted. */
  comicIds?: readonly string[];
  /** Name for the file ("Berserk 2026-10-04.mangareader"). */
  label?: string;
  onClose: () => void;
}

/**
 * Creates the file that moves comics (with progress and collections) to another device, then
 * hands it to the share sheet (Quick Share, Bluetooth…) or saves it in the comics folder.
 */
export function ExportSheet({ title, comicIds, label, onClose }: ExportSheetProps) {
  const { t, i18n } = useTranslation();
  const sheetId = useId();
  const items = useLibraryStore((state) => state.items);
  const exporting = useTransferStore((state) => state.exporting);
  // Select the settings object (stable); getComicsFolder() returns a new copy each call.
  const settings = useSettingsStore((state) => state.settings);
  const folder = settings.getComicsFolder();
  const transfer = useTransferStore.getState();

  const comics = (comicIds ?? items.toArray().map((item) => item.getComic().getId())).flatMap(
    (id) => items.findById(id)?.getComic() ?? [],
  );
  const size = comics.reduce((total, comic) => total + comic.getStoredSize(), 0);
  const bytes = (value: number) => formatBytes(value, i18n.language);

  let body;
  if (exporting.status === 'running') {
    const percent = exporting.total > 0 ? Math.round((exporting.done / exporting.total) * 100) : 0;
    body = (
      <>
        <div className={styles.transferStatus} role="status">
          <span>{t('transfer.creating', { percent })}</span>
          <span className={styles.importBar} aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={transfer.cancelExport}>
          {t('transfer.cancel')}
        </button>
      </>
    );
  } else if (exporting.status === 'done') {
    body = (
      <>
        <div className={styles.transferStatus} role="status">
          <strong>
            <CircleCheck size={20} strokeWidth={2} aria-hidden className={styles.hudDone} />{' '}
            {t('transfer.ready')}
          </strong>
          <span className={styles.hudDetail}>
            {exporting.file.fileName} · {bytes(exporting.file.size)}
          </span>
        </div>
        <button
          type="button"
          className={controls.filledButton}
          onClick={() => void transfer.shareExport(title)}
        >
          <Send size={20} strokeWidth={2} aria-hidden />
          {t('transfer.share')}
        </button>
        <p className={styles.infoHint}>{t('transfer.shareHint')}</p>
        {folder && (
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={exporting.savedToFolder}
            onClick={() => void transfer.saveExportToFolder()}
          >
            {exporting.savedToFolder
              ? t('transfer.saved', { folder: folder.name })
              : t('transfer.saveToFolder')}
          </button>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className={styles.infoHint}>
          {t('transfer.summary', { count: comics.length, size: bytes(size) })}
        </p>
        {exporting.status === 'error' && (
          <p className={styles.formError} role="alert">
            {t('transfer.failed')}: {t(`errors.${exporting.code}`)}
          </p>
        )}
        <p className={styles.infoHint}>
          {t('transfer.footer')} {t('transfer.needsSpace', { size: bytes(size) })}
        </p>
        <button
          type="button"
          className={controls.filledButton}
          disabled={comics.length === 0}
          onClick={() => {
            haptics.impact('light');
            void transfer.exportLibrary({ comicIds, label });
          }}
        >
          {t('transfer.start')}
        </button>
      </>
    );
  }

  return (
    <Sheet
      id={sheetId}
      title={title}
      closeLabel={t('transfer.close')}
      autoOpen
      onClose={() => {
        transfer.resetExport();
        onClose();
      }}
    >
      <div className={styles.infoForm}>{body}</div>
    </Sheet>
  );
}
