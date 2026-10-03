import { useTranslation } from 'react-i18next';
import { HeaderLink } from '../common/HeaderLink';
import { ScreenHeader } from '../common/ScreenHeader';
import styles from '../common/Screen.module.css';

export function ReaderScreen() {
  const { t } = useTranslation();
  return (
    <>
      <ScreenHeader
        title={t('reader.title')}
        start={<HeaderLink to="/" label={t('nav.back')} icon="←" />}
      />
      <main className={styles.content}>
        <p className={styles.muted}>{t('reader.placeholder')}</p>
      </main>
    </>
  );
}
