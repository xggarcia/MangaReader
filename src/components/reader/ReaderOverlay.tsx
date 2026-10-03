import { ALargeSmall, ChevronLeft } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { goBack } from '../../app/navigation';
import type { ReadingDirection } from '../../modules/reading/domain/ReadingDirection';
import styles from './Reader.module.css';

interface ReaderOverlayProps {
  visible: boolean;
  title: string;
  currentIndex: number;
  /** Pages on screen, in reading order (two in a spread). */
  visiblePages: number[];
  pageCount: number;
  direction: ReadingDirection;
  /** Id of the reading options sheet. */
  optionsId: string;
  onGoTo: (index: number) => void;
}

/**
 * Reader chrome: translucent top and bottom bars that glide in and out with the centre tap.
 * The scrubber shows a floating page bubble while dragging.
 */
export function ReaderOverlay({
  visible,
  title,
  currentIndex,
  visiblePages,
  pageCount,
  direction,
  optionsId,
  onGoTo,
}: ReaderOverlayProps) {
  const { t } = useTranslation();
  const [scrubbing, setScrubbing] = useState(false);
  const current = currentIndex + 1;
  const first = (visiblePages[0] ?? currentIndex) + 1;
  const last = (visiblePages[visiblePages.length - 1] ?? currentIndex) + 1;
  const shown = first === last ? String(first) : `${first}–${last}`;
  const fraction = pageCount > 1 ? currentIndex / (pageCount - 1) : 0;
  const rtl = direction.isRightToLeft();

  return (
    <div className={styles.overlay} data-visible={visible} inert={!visible}>
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={goBack}
          aria-label={t('reader.backToLibrary')}
        >
          <ChevronLeft size={28} strokeWidth={2.2} aria-hidden />
        </button>
        <h1 className={styles.title}>{title}</h1>
        <button
          type="button"
          className={styles.iconButton}
          popoverTarget={optionsId}
          aria-label={t('reader.options')}
        >
          <ALargeSmall size={24} strokeWidth={2} aria-hidden />
        </button>
      </header>

      <footer className={styles.bottomBar}>
        <div
          className={styles.scrubber}
          data-rtl={rtl}
          style={{ '--fraction': rtl ? 1 - fraction : fraction } as CSSProperties}
        >
          <span className={styles.bubble} data-visible={scrubbing} aria-hidden="true">
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
            dir={rtl ? 'rtl' : 'ltr'}
            aria-label={t('reader.pageSlider')}
            aria-valuetext={t('reader.pageAlt', { current, total: pageCount })}
            onChange={(event) => onGoTo(Number(event.target.value) - 1)}
            onPointerDown={() => setScrubbing(true)}
            onPointerUp={() => setScrubbing(false)}
            onPointerCancel={() => setScrubbing(false)}
          />
        </div>
        <span className={styles.counter}>
          {t('reader.pageCounter', { current: shown, total: pageCount })}
        </span>
      </footer>
    </div>
  );
}
