import { Check, Plus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COLLECTION_COLORS } from '../../modules/library/domain/Collection';
import { haptics } from '../../shared/infrastructure/haptics';
import { useCollectionsStore } from '../../stores/collectionsStore';
import { Sheet } from '../ui/Sheet';
import { COLLECTION_COLOR_VALUES } from './collectionColors';
import styles from './Collections.module.css';

interface CollectionPickerSheetProps {
  comicId: string;
  comicTitle: string;
  onClose: () => void;
}

/** Checklist of collections for one comic, plus a quick field to create a new one with it. */
export function CollectionPickerSheet({
  comicId,
  comicTitle,
  onClose,
}: CollectionPickerSheetProps) {
  const { t } = useTranslation();
  const sheetId = useId();
  const collections = useCollectionsStore((state) => state.collections);
  const loaded = useCollectionsStore((state) => state.loaded);
  const { load, setComicIncluded, create } = useCollectionsStore.getState();
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const createWithComic = () => {
    const name = newName.trim();
    if (!name) return;
    haptics.success();
    // Cycle through the palette so consecutive collections look different.
    const color = COLLECTION_COLORS[collections.length % COLLECTION_COLORS.length] ?? 'magenta';
    void create({ name, color, comicIds: [comicId] });
    setNewName('');
  };

  return (
    <Sheet
      id={sheetId}
      title={t('collections.addTo')}
      closeLabel={t('reader.done')}
      autoOpen
      onClose={onClose}
    >
      <p className={styles.pickerSubtitle}>{comicTitle}</p>
      {collections.length > 0 && (
        <ul className={styles.pickerList}>
          {collections.map((collection) => {
            const included = collection.contains(comicId);
            return (
              <li key={collection.getId()}>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={included}
                  className={styles.pickerRow}
                  onClick={() => {
                    haptics.selection();
                    void setComicIncluded(collection.getId(), comicId, !included);
                  }}
                >
                  <span
                    className={styles.pickerDot}
                    style={{ background: COLLECTION_COLOR_VALUES[collection.getColor()] }}
                    aria-hidden="true"
                  />
                  <span className={styles.pickerName}>{collection.getName()}</span>
                  <span className={styles.pickerCount}>{collection.count()}</span>
                  <span className={styles.pickerCheck} aria-hidden="true">
                    {included && <Check size={20} strokeWidth={2.6} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className={styles.pickerNew}
        onSubmit={(event) => {
          event.preventDefault();
          createWithComic();
        }}
      >
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={t('collections.newPlaceholder')}
          aria-label={t('collections.new')}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button type="submit" aria-label={t('collections.create')} disabled={!newName.trim()}>
          <Plus size={20} strokeWidth={2.4} aria-hidden />
        </button>
      </form>
    </Sheet>
  );
}
