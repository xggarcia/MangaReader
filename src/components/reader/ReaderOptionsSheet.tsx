import { useTranslation } from 'react-i18next';
import type { Settings, SettingsPrimitive } from '../../modules/settings/domain/Settings';
import { ReadingPreferencesFields } from '../settings/ReadingPreferencesFields';
import { Sheet } from '../ui/Sheet';

interface ReaderOptionsSheetProps {
  id: string;
  settings: Settings;
  onChange: (changes: Partial<SettingsPrimitive>) => void;
}

/** Quick reading preferences in an iOS sheet over the reader. Changes are saved. */
export function ReaderOptionsSheet({ id, settings, onChange }: ReaderOptionsSheetProps) {
  const { t } = useTranslation();
  return (
    // Always dark over the black reader, so the sheet never flashes white in a dark room.
    <div data-theme="dark" style={{ display: 'contents' }}>
      <Sheet id={id} title={t('reader.options')} closeLabel={t('reader.done')}>
        <ReadingPreferencesFields settings={settings} onChange={onChange} />
      </Sheet>
    </div>
  );
}
