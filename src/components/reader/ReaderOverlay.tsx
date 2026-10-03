import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ReadingDirection } from '../../modules/reading/domain/ReadingDirection';
import styles from './Reader.module.css';

interface ReaderOverlayProps {
  title: string;
  currentIndex: number;
  pageCount: number;
  direction: ReadingDirection;
  onGoTo: (index: number) => void;
}

export function ReaderOverlay({
  title,
  currentIndex,
  pageCount,
  direction,
  onGoTo,
}: ReaderOverlayProps) {
  const { t } = useTranslation();
  const current = currentIndex + 1;

  return (
    <>
      <header className={styles.topBar}>
        <Link to="/" className={styles.iconButton} aria-label={t('reader.backToLibrary')}>
          <span aria-hidden="true">←</span>
        </Link>
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.counter} aria-hidden="true">
          {t('reader.pageCounter', { current, total: pageCount })}
        </span>
      </header>
      <footer className={styles.bottomBar}>
        <input
          className={styles.slider}
          type="range"
          min={1}
          max={pageCount}
          step={1}
          value={current}
          // The slider grows in the reading direction, like the page order.
          dir={direction.isRightToLeft() ? 'rtl' : 'ltr'}
          aria-label={t('reader.pageSlider')}
          aria-valuetext={t('reader.pageAlt', { current, total: pageCount })}
          onChange={(event) => onGoTo(Number(event.target.value) - 1)}
        />
      </footer>
    </>
  );
}
