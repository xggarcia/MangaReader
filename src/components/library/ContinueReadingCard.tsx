import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCoverUrl } from '../../hooks/useCoverUrl';
import type { LibraryItem } from '../../modules/library/domain/LibraryItem';
import { openComic } from './openComic';
import styles from './Library.module.css';

/** The comic in progress, one tap away from the page where it was left. */
export function ContinueReadingCard({ item }: { item: LibraryItem }) {
  const { t } = useTranslation();
  const comic = item.getComic();
  const coverUrl = useCoverUrl(comic.getId());
  const cover = useRef<HTMLSpanElement>(null);
  const page = item.getResumePage() + 1;
  const total = comic.getPageCount();
  const percent = Math.round(item.getProgressRatio() * 100);

  return (
    <section className={styles.continue} aria-labelledby="continue-title">
      <h2 id="continue-title" className={styles.continueHeading}>
        {t('library.continueReading')}
      </h2>
      <button
        type="button"
        className={styles.continueCard}
        onClick={() => openComic(comic.getId(), cover.current)}
        aria-label={`${t('library.continue')}: ${comic.getTitle()}`}
      >
        <span ref={cover} className={styles.continueCover}>
          {coverUrl && <img src={coverUrl} alt="" draggable={false} />}
        </span>
        <span className={styles.continueBody}>
          <span className={styles.continueTitle}>{comic.getTitle()}</span>
          <span className={styles.continueMeta}>
            {t('library.pageOf', { current: page, total })} · {t('library.percent', { percent })}
          </span>
          <span className={styles.continueBar} aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
        </span>
        <span className={styles.capsule} aria-hidden="true">
          {t('library.continue')}
        </span>
      </button>
    </section>
  );
}
