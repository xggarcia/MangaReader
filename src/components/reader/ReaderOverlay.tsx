import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ReadingDirection } from '../../modules/reading/domain/ReadingDirection';
import styles from './Reader.module.css';

interface ReaderOverlayProps {
  title: string;
  currentIndex: number;
  /** Pages on screen, in reading order (two in a spread). */
  visiblePages: number[];
  pageCount: number;
  direction: ReadingDirection;
  /** Id of the reading options popover. */
  optionsId: string;
  onGoTo: (index: number) => void;
}

export function ReaderOverlay({
  title,
  currentIndex,
  visiblePages,
  pageCount,
  direction,
  optionsId,
  onGoTo,
}: ReaderOverlayProps) {
  const { t } = useTranslation();
  const current = currentIndex + 1;
  const first = (visiblePages[0] ?? currentIndex) + 1;
  const last = (visiblePages[visiblePages.length - 1] ?? currentIndex) + 1;
  const shown = first === last ? String(first) : `${first}–${last}`;

  return (
    <>
      <header className={styles.topBar}>
        <Link to="/" className={styles.iconButton} aria-label={t('reader.backToLibrary')}>
          <span aria-hidden="true">←</span>
        </Link>
        <h1 className={styles.title}>{title}</h1>
        <button
          type="button"
          className={styles.iconButton}
          popoverTarget={optionsId}
          aria-label={t('reader.options')}
        >
          <span aria-hidden="true">Aa</span>
        </button>
      </header>
      <footer className={styles.bottomBar}>
        <span className={styles.counter} aria-hidden="true">
          {t('reader.pageCounter', { current: shown, total: pageCount })}
        </span>
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
