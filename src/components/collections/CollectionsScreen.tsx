import { Folders, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
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
