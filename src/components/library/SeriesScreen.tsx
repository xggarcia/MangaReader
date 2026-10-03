import { BookCheck, BookX, ChevronLeft, Ellipsis, FolderPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { goBack } from '../../app/navigation';
import { useLibraryStore } from '../../stores/libraryStore';
import { CollectionPickerSheet } from '../collections/CollectionPickerSheet';
import collectionStyles from '../collections/Collections.module.css';
import { BarButton } from '../ui/BarButton';
import { LargeTitleScreen } from '../ui/LargeTitleScreen';
import { Menu } from '../ui/Menu';
import { ContinueReadingCard } from './ContinueReadingCard';
import { LibraryShelf } from './LibraryShelf';
import styles from './Library.module.css';

/** All volumes of a series in order, with where to continue and bulk actions. */
export function SeriesScreen() {
  const { t } = useTranslation();
  const { seriesKey = '' } = useParams();
  const items = useLibraryStore((state) => state.items);
  const status = useLibraryStore((state) => state.status);
  const group = items.findSeries(decodeURIComponent(seriesKey));
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    void useLibraryStore.getState().load();
  }, []);

  const back = (
    <button type="button" className={collectionStyles.backButton} onClick={goBack}>
      <ChevronLeft size={28} strokeWidth={2.2} aria-hidden />
      <span>{t('library.title')}</span>
    </button>
  );

  if (!group) {
    return (
      <LargeTitleScreen title={t('library.title')} leading={back}>
        {status === 'ready' && <p className={styles.noResults}>{t('errors.notFound')}</p>}
      </LargeTitleScreen>
    );
  }

  const volumes = group.getVolumes();
  const ids = volumes.map((item) => item.getComic().getId());
  const next = group.getNextToRead();
  const { setReadStatusMany } = useLibraryStore.getState();
  const summary = [
    t('library.volumes', { count: group.count() }),
    group.countByStatus('read') > 0
      ? t('series.readCount', { count: group.countByStatus('read') })
      : null,
    group.countByStatus('unread') > 0
      ? t('library.unreadCount', { count: group.countByStatus('unread') })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <LargeTitleScreen
      title={group.getName()}
      leading={back}
      trailing={
        <Menu
          label={t('series.options')}
          items={[
            {
              id: 'read',
              label: t('series.markAllRead'),
              icon: BookCheck,
              onSelect: () => void setReadStatusMany(ids, true),
            },
            {
              id: 'unread',
              label: t('series.markAllUnread'),
              icon: BookX,
              onSelect: () => void setReadStatusMany(ids, false),
            },
            {
              id: 'collection',
              label: t('series.addToCollection'),
              icon: FolderPlus,
              dividerBefore: true,
              onSelect: () => setPicking(true),
            },
          ]}
          trigger={(triggerProps) => (
            <BarButton label={t('series.options')} {...triggerProps}>
              <Ellipsis size={24} strokeWidth={2.2} aria-hidden />
            </BarButton>
          )}
        />
      }
    >
      <p className={styles.seriesSummary}>{summary}</p>
      {!group.isFinished() && <ContinueReadingCard item={next} heading={t('series.next')} />}
      <LibraryShelf items={volumes} />
      {picking && (
        <CollectionPickerSheet
          comicIds={ids}
          subtitle={group.getName()}
          onClose={() => setPicking(false)}
        />
      )}
    </LargeTitleScreen>
  );
}
