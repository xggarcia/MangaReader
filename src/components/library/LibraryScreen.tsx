import { useTranslation } from 'react-i18next';
import { HeaderLink } from '../common/HeaderLink';
import { ScreenHeader } from '../common/ScreenHeader';
import styles from '../common/Screen.module.css';

export function LibraryScreen() {
  const { t } = useTranslation();
  return (
    <>
      <ScreenHeader
        title={t('library.title')}
        end={<HeaderLink to="/settings" label={t('nav.settings')} icon="⚙" />}
      />
      <main className={styles.content}>
        <section className={styles.emptyState} aria-labelledby="library-empty">
          <p id="library-empty">{t('library.empty')}</p>
          <p className={styles.muted}>{t('library.emptyHint')}</p>
        </section>
      </main>
    </>
  );
}
