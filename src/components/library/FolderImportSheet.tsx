import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../../i18n/formatBytes';
import type { DeviceFile } from '../../modules/library/domain/DeviceFile';
import { haptics } from '../../shared/infrastructure/haptics';
import { useDeviceFilesStore } from '../../stores/deviceFilesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import controls from '../ui/Controls.module.css';
import { Sheet } from '../ui/Sheet';
import styles from './Library.module.css';

interface FolderImportSheetProps {
  files: readonly DeviceFile[];
  onClose: () => void;
}

/** Review the new comics found in the comics folder and import the chosen ones. */
export function FolderImportSheet({ files, onClose }: FolderImportSheetProps) {
  const { t, i18n } = useTranslation();
  const sheetId = useId();
  const settings = useSettingsStore((state) => state.settings);
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(files.map((file) => file.getUri())),
  );
  const chosen = files.filter((file) => selected.has(file.getUri()));
  const allSelected = chosen.length === files.length;
  const deleteMode = settings.getDeleteOriginals();
  const deleteHint =
    deleteMode === 'afterReduce' && !settings.getImportOptimization()
      ? t('folder.willDelete.afterReduceOff')
      : t(`folder.willDelete.${deleteMode}`);

  const toggle = (uri: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  };

  const start = () => {
    haptics.success();
    void useDeviceFilesStore.getState().importComics(chosen);
    document.getElementById(sheetId)?.hidePopover();
  };

  return (
    <Sheet
      id={sheetId}
      title={t('folder.sheetTitle')}
      closeLabel={t('library.cancel')}
      autoOpen
      onClose={onClose}
    >
      <div className={styles.infoForm}>
        <div className={styles.choiceToolbar}>
          <p className={styles.infoHint}>
            {t('transfer.summary', {
              count: chosen.length,
              size: formatBytes(
                chosen.reduce((total, file) => total + file.getSize(), 0),
                i18n.language,
              ),
            })}
          </p>
          <button
            type="button"
            className={styles.textButton}
            onClick={() =>
              setSelected(allSelected ? new Set() : new Set(files.map((file) => file.getUri())))
            }
          >
            {allSelected ? t('folder.selectNone') : t('folder.selectAll')}
          </button>
        </div>
        <div className={styles.choiceList}>
          {files.map((file) => (
            <label key={file.getUri()} className={styles.choiceOption}>
              <input
                type="checkbox"
                checked={selected.has(file.getUri())}
                onChange={() => toggle(file.getUri())}
              />
              <span className={styles.choiceText}>
                <span className={styles.choiceLabel}>{file.getName()}</span>
                <span className={styles.choiceDetail}>
                  {[file.getFolder(), formatBytes(file.getSize(), i18n.language)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <Check size={20} strokeWidth={2.4} aria-hidden className={styles.choiceCheck} />
            </label>
          ))}
        </div>
        <p className={styles.infoHint}>{deleteHint}</p>
        <button
          type="button"
          className={controls.filledButton}
          disabled={chosen.length === 0}
          onClick={start}
        >
          {t('folder.import', { count: chosen.length })}
        </button>
      </div>
    </Sheet>
  );
}
