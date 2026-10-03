import { useTranslation } from 'react-i18next';
import { FIT_MODES } from '../../modules/reading/domain/FitMode';
import { READING_MODES } from '../../modules/reading/domain/ReadingMode';
import {
  MAX_BRIGHTNESS,
  MIN_BRIGHTNESS,
  type Settings,
  type SettingsPrimitive,
} from '../../modules/settings/domain/Settings';
import { SegmentedControl } from '../common/SegmentedControl';
import styles from './Reader.module.css';

interface ReaderOptionsSheetProps {
  id: string;
  settings: Settings;
  onChange: (changes: Partial<SettingsPrimitive>) => void;
}

/** Quick reading preferences, available from the reader overlay. Changes are saved. */
export function ReaderOptionsSheet({ id, settings, onChange }: ReaderOptionsSheetProps) {
  const { t } = useTranslation();
  const values = settings.toPrimitive();

  return (
    <div id={id} popover="auto" className={styles.optionsSheet}>
      <h2 className={styles.optionsTitle}>{t('reader.options')}</h2>
      <SegmentedControl
        legend={t('reader.modeLabel')}
        value={values.readingMode}
        options={READING_MODES.map((mode) => ({ value: mode, label: t(`reader.mode.${mode}`) }))}
        onChange={(readingMode) => onChange({ readingMode })}
      />
      <SegmentedControl
        legend={t('reader.directionLabel')}
        value={values.readingDirection}
        options={(['rtl', 'ltr'] as const).map((direction) => ({
          value: direction,
          label: t(`reader.direction.${direction}`),
        }))}
        onChange={(readingDirection) => onChange({ readingDirection })}
      />
      <SegmentedControl
        legend={t('reader.fitLabel')}
        value={values.fitMode}
        options={FIT_MODES.map((fit) => ({ value: fit, label: t(`reader.fit.${fit}`) }))}
        onChange={(fitMode) => onChange({ fitMode })}
        disabled={values.readingMode === 'webtoon'}
      />
      <label className={styles.brightness}>
        <span>{t('reader.brightness')}</span>
        <input
          type="range"
          min={MIN_BRIGHTNESS}
          max={MAX_BRIGHTNESS}
          step={0.05}
          value={values.brightness}
          aria-valuetext={`${Math.round(values.brightness * 100)}%`}
          onChange={(event) => onChange({ brightness: Number(event.target.value) })}
        />
      </label>
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
