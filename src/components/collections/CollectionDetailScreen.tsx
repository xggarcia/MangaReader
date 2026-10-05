import { ChevronLeft, Ellipsis, Pencil, Smartphone, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { goBack } from '../../app/navigation';
import type { LibraryItem } from '../../modules/library/domain/LibraryItem';
import { useCollectionsStore } from '../../stores/collectionsStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useSyncStore } from '../../stores/syncStore';
import { SendSheet } from '../sync/SendSheet';
import { LibraryShelf } from '../library/LibraryShelf';
import { BarButton } from '../ui/BarButton';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { LargeTitleScreen } from '../ui/LargeTitleScreen';
import { Menu } from '../ui/Menu';
import { CollectionEditorSheet } from './CollectionEditorSheet';
import styles from './Collections.module.css';

export function CollectionDetailScreen() {
  const { t } = useTranslation();
  const { collectionId = '' } = useParams();
  const collection = useCollectionsStore((state) =>
    state.collections.find((candidate) => candidate.getId() === collectionId),
  );
  const loaded = useCollectionsStore((state) => state.loaded);
  const library = useLibraryStore((state) => state.items);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [sending, setSending] = useState(false);
  const canSend = useSyncStore((state) => state.peers.length > 0);

  useEffect(() => {
    if (!loaded) void useCollectionsStore.getState().load();
    void useLibraryStore.getState().load();
  }, [loaded]);

  // Comics in the order they were added to the collection.
  const items = useMemo(
    () =>
      (collection?.getComicIds() ?? [])
        .map((comicId) => library.findById(comicId))
        .filter((item): item is LibraryItem => item !== null),
    [collection, library],
  );

  const back = (
    <button type="button" className={styles.backButton} onClick={goBack}>
      <ChevronLeft size={28} strokeWidth={2.2} aria-hidden />
      <span>{t('collections.title')}</span>
    </button>
  );

  if (!collection) {
    return (
      <LargeTitleScreen title={t('collections.title')} leading={back}>
        {loaded && <p className={styles.emptyText}>{t('errors.notFound')}</p>}
      </LargeTitleScreen>
    );
  }

  return (
    <LargeTitleScreen
      title={collection.getName()}
      leading={back}
      trailing={
        <Menu
          label={t('collections.options')}
          items={[
            {
              id: 'edit',
              label: t('collections.edit'),
              icon: Pencil,
              onSelect: () => setEditing(true),
            },
            ...(canSend && items.length > 0
              ? [
                  {
                    id: 'send',
                    label: t('deviceSend.collectionAction'),
                    icon: Smartphone,
                    onSelect: () => setSending(true),
                  },
                ]
              : []),
            {
              id: 'delete',
              label: t('collections.delete'),
              icon: Trash2,
              destructive: true,
              onSelect: () => setConfirmingDelete(true),
            },
          ]}
          trigger={(triggerProps) => (
            <BarButton label={t('collections.options')} {...triggerProps}>
              <Ellipsis size={24} strokeWidth={2.2} aria-hidden />
            </BarButton>
          )}
        />
      }
    >
      <p className={styles.detailCount}>{t('collections.count', { count: items.length })}</p>
      {items.length === 0 ? (
        <p className={styles.detailEmpty}>{t('collections.detailEmpty')}</p>
      ) : (
        <LibraryShelf items={items} />
      )}

      {editing && (
        <CollectionEditorSheet
          title={t('collections.edit')}
          initialName={collection.getName()}
          initialColor={collection.getColor()}
          onSave={(values) => void useCollectionsStore.getState().update(collectionId, values)}
          onClose={() => setEditing(false)}
        />
      )}
      {sending && (
        <SendSheet
          title={t('deviceSend.collectionAction')}
          comicIds={items.map((item) => item.getComic().getId())}
          collectionId={collectionId}
          onClose={() => setSending(false)}
        />
      )}
      {confirmingDelete && (
        <ConfirmSheet
          title={t('collections.deleteConfirm', { name: collection.getName() })}
          confirmLabel={t('collections.delete')}
          cancelLabel={t('library.cancel')}
          destructive
          onConfirm={() => {
            void useCollectionsStore.getState().remove(collectionId);
            goBack();
          }}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </LargeTitleScreen>
  );
}
