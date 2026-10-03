import { Check, CircleCheck } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { goTo } from '../../app/navigation';
import { useCoverUrl } from '../../hooks/useCoverUrl';
import type { SeriesGroup } from '../../modules/library/domain/SeriesGroup';
import { seriesPath } from './openComic';
import { useSelection } from './useSelection';
import styles from './Library.module.css';

/** A series with several volumes: a stack of covers that opens the series screen. */
export const SeriesTile = memo(function SeriesTile({ group }: { group: SeriesGroup }) {
  const { t } = useTranslation();
  const cover = group.getCoverItem();
  const coverUrl = useCoverUrl(cover.getComic().getId());
  const selection = useSelection();
  const volumeIds = group.getVolumes().map((item) => item.getComic().getId());
  const selected = selection.isSelected(volumeIds);
  const unread = group.countByStatus('unread');
  const finished = group.isFinished();
  const percent = Math.round(group.getProgressRatio() * 100);

  return (
    <li className={styles.cell}>
      <button
        type="button"
        className={`${styles.cover} ${styles.stack}`}
        aria-pressed={selection.active ? selected : undefined}
        aria-label={t('library.openSeries', { name: group.getName(), count: group.count() })}
        onClick={() => {
          if (selection.active) selection.toggle(volumeIds);
          else goTo(seriesPath(group.getKey()), 'forward');
        }}
      >
        {coverUrl && <img src={coverUrl} alt="" draggable={false} decoding="async" />}
        <span className={styles.stackCount} aria-hidden="true">
          {group.count()}
        </span>
        {finished && (
          <span className={styles.readBadge} aria-hidden="true">
            <Check size={13} strokeWidth={3} />
          </span>
        )}
        {selection.active && (
          <span className={styles.selectMark} data-selected={selected} aria-hidden="true">
            {selected && <CircleCheck size={26} strokeWidth={2} />}
          </span>
        )}
      </button>
      <div className={styles.cellText}>
        <h2 className={styles.cellTitle}>{group.getName()}</h2>
        <p className={styles.cellSubtitle}>{t('library.volumes', { count: group.count() })}</p>
        <div className={styles.cellMeta}>
          {finished ? (
            <span className={styles.statusRead}>
              <Check size={13} strokeWidth={2.6} aria-hidden />
              {t('library.seriesFinished')}
            </span>
          ) : unread === group.count() ? (
            <span className={styles.statusNew}>{t('library.new')}</span>
          ) : (
            <span className={styles.statusProgress}>
              {unread > 0
                ? t('library.unreadCount', { count: unread })
                : t('library.percent', { percent })}
            </span>
          )}
        </div>
      </div>
    </li>
  );
});
