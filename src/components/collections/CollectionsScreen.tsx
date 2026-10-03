import { BookOpen, CircleCheck, CircleDashed, Folders, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { goTo } from '../../app/navigation';
import { GroupedSection, LinkRow } from '../ui/GroupedList';
import { useTranslation } from 'react-i18next';
import { useCollectionsStore } from '../../stores/collectionsStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { BarButton } from '../ui/BarButton';
import controls from '../ui/Controls.module.css';
import { LargeTitleScreen } from '../ui/LargeTitleScreen';
import { CollectionEditorSheet } from './CollectionEditorSheet';
import { CollectionTile } from './CollectionTile';
import styles from './Collections.module.css';

export function CollectionsScreen() {
  const { t } = useTranslation();
  const collections = useCollectionsStore((state) => state.collections);
  const loaded = useCollectionsStore((state) => state.loaded);
  const [creating, setCreating] = useState(false);
  const library = useLibraryStore((state) => state.items);
  // Automatic collections by reading state; always up to date, nothing to maintain.
  const smart = useMemo(
    () =>
      (
        [
          { status: 'inProgress', icon: BookOpen, color: '#ff9500' },
          { status: 'unread', icon: CircleDashed, color: '#007aff' },
          { status: 'read', icon: CircleCheck, color: '#34c759' },
        ] as const
      ).map((entry) => ({ ...entry, count: library.filterByStatus(entry.status).count() })),
    [library],
  );

  useEffect(() => {
    void useCollectionsStore.getState().load();
    void useLibraryStore.getState().load();
  }, []);

  return (
    <LargeTitleScreen
      title={t('collections.title')}
      trailing={
        <BarButton label={t('collections.new')} onClick={() => setCreating(true)}>
          <Plus size={26} strokeWidth={2} aria-hidden />
        </BarButton>
      }
    >
      <GroupedSection title={t('collections.smart.title')}>
        {smart.map(({ status, icon, color, count }) => (
          <LinkRow
            key={status}
            icon={icon}
            iconColor={color}
            label={t(`collections.smart.${status}`)}
            detail={String(count)}
            onClick={() => goTo(`/collections/smart/${status}`, 'forward')}
          />
        ))}
      </GroupedSection>

      {collections.length > 0 && <h2 className={styles.sectionHeading}>{t('collections.mine')}</h2>}

      {loaded && collections.length === 0 && (
        <section className={styles.empty} aria-labelledby="collections-empty">
          <Folders size={56} strokeWidth={1.25} aria-hidden className={styles.emptyIcon} />
          <h2 id="collections-empty" className={styles.emptyTitle}>
            {t('collections.emptyTitle')}
          </h2>
          <p className={styles.emptyText}>{t('collections.emptyText')}</p>
          <button type="button" className={controls.filledButton} onClick={() => setCreating(true)}>
            {t('collections.new')}
          </button>
        </section>
      )}

      {collections.length > 0 && (
        <ul className={styles.tiles}>
          {collections.map((collection) => (
            <CollectionTile key={collection.getId()} collection={collection} />
          ))}
        </ul>
      )}

      {creating && (
        <CollectionEditorSheet
          title={t('collections.new')}
          onSave={(values) => void useCollectionsStore.getState().create(values)}
          onClose={() => setCreating(false)}
        />
      )}
    </LargeTitleScreen>
  );
}
