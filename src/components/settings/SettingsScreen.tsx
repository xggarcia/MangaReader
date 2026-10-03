import {
  ArrowLeftRight,
  BookOpen,
  Globe,
  Maximize,
  Moon,
  ShieldCheck,
  Sun,
  SunDim,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useReadingOptions } from '../../hooks/useReadingOptions';
import { MAX_BRIGHTNESS, MIN_BRIGHTNESS } from '../../modules/settings/domain/Settings';
import { useSettingsStore } from '../../stores/settingsStore';
import { GroupedSection, MenuRow, Row } from '../ui/GroupedList';
import { LargeTitleScreen } from '../ui/LargeTitleScreen';
import styles from './Settings.module.css';

const APP_VERSION = '0.2.0';

export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);
  const values = settings.toPrimitive();
  const options = useReadingOptions();

  return (
    <LargeTitleScreen title={t('settings.title')}>
      <GroupedSection title={t('settings.readingDefaults')} footer={t('settings.readingFooter')}>
        <MenuRow
          icon={BookOpen}
          iconColor="#5856d6"
          label={t('reader.modeLabel')}
          value={values.readingMode}
          options={options.modes}
          onChange={(readingMode) => void update({ readingMode })}
        />
        <MenuRow
          icon={ArrowLeftRight}
          iconColor="#ff9500"
          label={t('reader.directionLabel')}
          value={values.readingDirection}
          options={options.directions}
          onChange={(readingDirection) => void update({ readingDirection })}
        />
        <MenuRow
          icon={Maximize}
          iconColor="#34c759"
          label={t('reader.fitLabel')}
          value={values.fitMode}
          options={options.fits}
          onChange={(fitMode) => void update({ fitMode })}
        />
      </GroupedSection>

      <GroupedSection title={t('reader.brightness')} footer={t('settings.brightnessFooter')}>
        <div className={styles.sliderRow}>
          <SunDim size={18} aria-hidden className={styles.sliderIcon} />
          <input
            type="range"
            min={MIN_BRIGHTNESS}
            max={MAX_BRIGHTNESS}
            step={0.05}
            value={values.brightness}
            aria-label={t('reader.brightness')}
            aria-valuetext={`${Math.round(values.brightness * 100)}%`}
            onChange={(event) => void update({ brightness: Number(event.target.value) })}
          />
          <Sun size={22} aria-hidden className={styles.sliderIcon} />
        </div>
      </GroupedSection>

      <GroupedSection title={t('settings.appearance')}>
        <MenuRow
          icon={Moon}
          iconColor="#5e5ce6"
          label={t('settings.theme')}
          value={values.theme}
          options={options.themes}
          onChange={(theme) => void update({ theme })}
        />
        <MenuRow
          icon={Globe}
          iconColor="#007aff"
          label={t('settings.language')}
          value={values.language}
          options={options.languages}
          onChange={(language) => void update({ language })}
        />
      </GroupedSection>

      <GroupedSection title={t('settings.privacy')} footer={t('settings.privacyText')}>
        <Row icon={ShieldCheck} iconColor="#34c759" label={t('settings.offline')}>
          {t('settings.offlineValue')}
        </Row>
      </GroupedSection>

      <GroupedSection title={t('settings.about')}>
        <Row label={t('app.name')}>{APP_VERSION}</Row>
      </GroupedSection>
    </LargeTitleScreen>
  );
}
