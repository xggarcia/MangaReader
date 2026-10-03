import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useReaderStore } from '../../stores/readerStore';
import { HeaderLink } from '../common/HeaderLink';
import { ScreenHeader } from '../common/ScreenHeader';
import styles from '../common/Screen.module.css';
import { OpenFileButton } from './OpenFileButton';

export function LibraryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setPendingFile = useReaderStore((state) => state.setPendingFile);

  const openFile = (file: File) => {
    setPendingFile(file);
    void navigate('/read/local');
  };

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
          <OpenFileButton onFileSelected={openFile} />
        </section>
      </main>
    </>
  );
}
