import { Sun, SunDim } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useReadingOptions } from '../../hooks/useReadingOptions';
import {
  MAX_BRIGHTNESS,
  MIN_BRIGHTNESS,
  type Settings,
  type SettingsPrimitive,
} from '../../modules/settings/domain/Settings';
import { SegmentedControl } from '../common/SegmentedControl';
import styles from './Settings.module.css';

interface ReadingPreferencesFieldsProps {
  settings: Settings;
  onChange: (changes: Partial<SettingsPrimitive>) => void;
}

/** Quick reading controls for the reader sheet: mode, direction, fit and brightness. */
export function ReadingPreferencesFields({ settings, onChange }: ReadingPreferencesFieldsProps) {
  const { t } = useTranslation();
  const values = settings.toPrimitive();
  const options = useReadingOptions();

  return (
    <>
      <SegmentedControl
        legend={t('reader.modeLabel')}
        value={values.readingMode}
        options={options.modes}
        onChange={(readingMode) => onChange({ readingMode })}
      />
      <SegmentedControl
        legend={t('reader.directionLabel')}
        value={values.readingDirection}
        options={options.directions}
        onChange={(readingDirection) => onChange({ readingDirection })}
      />
      <SegmentedControl
        legend={t('reader.fitLabel')}
        value={values.fitMode}
        options={options.fits}
        onChange={(fitMode) => onChange({ fitMode })}
        disabled={values.readingMode === 'webtoon'}
      />
      <p className={styles.sheetLabel} id="brightness-label">
        {t('reader.brightness')}
      </p>
      <div className={styles.sheetSlider}>
        <SunDim size={18} aria-hidden className={styles.sliderIcon} />
        <input
          type="range"
          min={MIN_BRIGHTNESS}
          max={MAX_BRIGHTNESS}
          step={0.05}
          value={values.brightness}
          aria-labelledby="brightness-label"
          aria-valuetext={`${Math.round(values.brightness * 100)}%`}
          onChange={(event) => onChange({ brightness: Number(event.target.value) })}
        />
        <Sun size={22} aria-hidden className={styles.sliderIcon} />
      </div>
    </>
  );
}
