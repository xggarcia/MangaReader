import { FolderDown, FolderX, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { folderSignature, useDeviceFilesStore } from '../../stores/deviceFilesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import controls from '../ui/Controls.module.css';
import { FolderImportSheet } from './FolderImportSheet';
import styles from './Library.module.css';

/** Library card: new comics (or an exported library) waiting in the comics folder. */
export function FolderNotice() {
  const { t } = useTranslation();
  const folder = useDeviceFilesStore((state) => state.folder);
  const unavailable = useDeviceFilesStore((state) => state.folderUnavailable);
  const dismissed = useDeviceFilesStore((state) => state.dismissed);
  const folderName = useSettingsStore((state) => state.settings.getComicsFolder()?.name ?? '');
  const [reviewing, setReviewing] = useState(false);
  const { dismissFolder } = useDeviceFilesStore.getState();

  if (unavailable) {
    return (
      <section className={styles.notice} role="status">
        <div className={styles.noticeHeader}>
          <FolderX size={20} strokeWidth={2} aria-hidden className={styles.importErrorIcon} />
          <p className={styles.noticeBody}>{t('folder.unavailable')}</p>
        </div>
      </section>
    );
  }
  if (!folder || (folder.comics.length === 0 && folder.exports.length === 0)) return null;
  if (dismissed === folderSignature(folder) && !reviewing) return null;

  const comicCount = folder.comics.length;
  const exportFile = folder.exports[0];
  const title =
    comicCount > 0
      ? t('folder.newComics', { count: comicCount, folder: folderName })
      : t('folder.exportsOnly', { folder: folderName });

  return (
    <section className={styles.notice} aria-labelledby="folder-notice-title">
      <div className={styles.noticeHeader}>
        <FolderDown size={20} strokeWidth={2} aria-hidden className={styles.installIcon} />
        <h2 id="folder-notice-title">{title}</h2>
        <button
          type="button"
          className={styles.dismiss}
          aria-label={t('library.dismiss')}
          onClick={dismissFolder}
        >
          <X size={18} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
      {folder.exports.length > 0 && comicCount > 0 && (
        <p className={styles.noticeBody}>
          {t('folder.newExports', { count: folder.exports.length })}
        </p>
      )}
      <div className={styles.noticeActions}>
        {comicCount > 0 && (
          <button
            type="button"
            className={controls.capsuleButton}
            onClick={() => setReviewing(true)}
          >
            {t('folder.review')}
          </button>
        )}
        {exportFile && (
          <button
            type="button"
            className={controls.capsuleButton}
            onClick={() => void useDeviceFilesStore.getState().importExportFile(exportFile)}
          >
            {t('transfer.import')}
          </button>
        )}
      </div>
      {reviewing && <FolderImportSheet files={folder.comics} onClose={() => setReviewing(false)} />}
    </section>
  );
}
