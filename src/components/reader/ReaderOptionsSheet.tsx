import { useTranslation } from 'react-i18next';
import type { Settings, SettingsPrimitive } from '../../modules/settings/domain/Settings';
import { ReadingPreferencesFields } from '../settings/ReadingPreferencesFields';
import styles from './Reader.module.css';

interface ReaderOptionsSheetProps {
  id: string;
  settings: Settings;
  onChange: (changes: Partial<SettingsPrimitive>) => void;
}

/** Quick reading preferences, available from the reader overlay. Changes are saved. */
export function ReaderOptionsSheet({ id, settings, onChange }: ReaderOptionsSheetProps) {
  const { t } = useTranslation();
  return (
    <div id={id} popover="auto" className={styles.optionsSheet}>
      <h2 className={styles.optionsTitle}>{t('reader.options')}</h2>
      <ReadingPreferencesFields settings={settings} onChange={onChange} />
      <button
        type="button"
        className={styles.optionsClose}
        popoverTarget={id}
        popoverTargetAction="hide"
      >
        {t('reader.close')}
      </button>
    </div>
  );
}
