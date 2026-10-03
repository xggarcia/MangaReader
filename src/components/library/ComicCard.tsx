import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useCoverUrl } from '../../hooks/useCoverUrl';
import type { LibraryItem } from '../../modules/library/domain/LibraryItem';
import styles from './Library.module.css';

interface ComicCardProps {
  item: LibraryItem;
  onSetReadStatus: (comicId: string, isRead: boolean) => void;
  onRemove: (comicId: string) => void;
}

export function ComicCard({ item, onSetReadStatus, onRemove }: ComicCardProps) {
  const { t } = useTranslation();
  const comic = item.getComic();
  const comicId = comic.getId();
  const title = comic.getTitle();
  const coverUrl = useCoverUrl(comicId);
  const titleId = useId();
  const sheetId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const percent = Math.round(item.getProgressRatio() * 100);
  const isRead = item.isRead();

  const series = comic.getSeries();
  const issue = comic.getNumber();
  const subtitle = series
    ? [series, issue ? t('library.issue', { number: issue }) : null].filter(Boolean).join(' ')
    : t('library.pages', { count: comic.getPageCount() });

  const runAndClose = (action: () => void) => {
    sheetRef.current?.hidePopover();
    action();
  };

  return (
    <li className={styles.cardItem}>
      <article className={styles.card} aria-labelledby={titleId}>
        <Link
          to={`/read/${comicId}`}
          className={styles.coverLink}
          aria-label={t('library.openComic', { title })}
        >
          {coverUrl ? (
            <img className={styles.cover} src={coverUrl} alt="" draggable={false} />
          ) : (
            <span className={styles.coverPlaceholder} aria-hidden="true">
              {title.slice(0, 1).toUpperCase()}
            </span>
          )}
          {isRead && <span className={styles.readBadge}>{t('library.read')}</span>}
        </Link>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={t('library.progressLabel')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
        <div className={styles.cardFooter}>
          <div className={styles.cardMeta}>
            <h2 id={titleId} className={styles.cardTitle}>
              {title}
            </h2>
            <p className={styles.cardSubtitle}>{subtitle}</p>
          </div>
          <button
            type="button"
            className={styles.menuButton}
            popoverTarget={sheetId}
            aria-label={t('library.comicOptions', { title })}
          >
            <span aria-hidden="true">⋮</span>
          </button>
        </div>
        <div ref={sheetRef} id={sheetId} popover="auto" className={styles.sheet}>
          <p className={styles.sheetTitle}>{title}</p>
          <button
            type="button"
            className={styles.sheetAction}
            onClick={() => runAndClose(() => onSetReadStatus(comicId, !isRead))}
          >
            {isRead ? t('library.markAsUnread') : t('library.markAsRead')}
          </button>
          <button
            type="button"
            className={`${styles.sheetAction} ${styles.danger}`}
            onClick={() =>
              runAndClose(() => {
                if (window.confirm(t('library.removeConfirm', { title }))) onRemove(comicId);
              })
            }
          >
            {t('library.remove')}
          </button>
          <button
            type="button"
            className={styles.sheetAction}
            popoverTarget={sheetId}
            popoverTargetAction="hide"
          >
            {t('library.cancel')}
          </button>
        </div>
      </article>
    </li>
  );
}
