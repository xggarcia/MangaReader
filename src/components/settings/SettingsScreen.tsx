import { useTranslation } from 'react-i18next';
import { LANGUAGES, THEMES } from '../../modules/settings/domain/Settings';
import { useSettingsStore } from '../../stores/settingsStore';
import { HeaderLink } from '../common/HeaderLink';
import { ScreenHeader } from '../common/ScreenHeader';
import { SegmentedControl } from '../common/SegmentedControl';
import screenStyles from '../common/Screen.module.css';
import { ReadingPreferencesFields } from './ReadingPreferencesFields';
import styles from './Settings.module.css';

export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);
  const values = settings.toPrimitive();

  return (
    <>
      <ScreenHeader
        title={t('settings.title')}
        start={<HeaderLink to="/" label={t('nav.back')} icon="←" />}
      />
      <main className={`${screenStyles.content} ${styles.settings}`}>
        <section aria-labelledby="settings-reading">
          <h2 id="settings-reading" className={styles.sectionTitle}>
            {t('settings.readingDefaults')}
          </h2>
          <ReadingPreferencesFields settings={settings} onChange={update} />
        </section>

        <section aria-labelledby="settings-appearance">
          <h2 id="settings-appearance" className={styles.sectionTitle}>
            {t('settings.appearance')}
          </h2>
          <SegmentedControl
            legend={t('settings.theme')}
            value={values.theme}
            options={THEMES.map((theme) => ({
              value: theme,
              label: t(`settings.themes.${theme}`),
            }))}
            onChange={(theme) => void update({ theme })}
          />
          <SegmentedControl
            legend={t('settings.language')}
            value={values.language}
            options={LANGUAGES.map((language) => ({
              value: language,
              label: t(`settings.languages.${language}`),
            }))}
            onChange={(language) => void update({ language })}
          />
        </section>

        <section aria-labelledby="settings-privacy">
          <h2 id="settings-privacy" className={styles.sectionTitle}>
            {t('settings.privacy')}
          </h2>
          <p className={screenStyles.muted}>{t('settings.privacyText')}</p>
        </section>
      </main>
    </>
  );
}
