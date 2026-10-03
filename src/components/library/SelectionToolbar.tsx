import { BookCheck, BookX, FolderPlus, Trash2, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { haptics } from '../../shared/infrastructure/haptics';
import { useLibraryStore } from '../../stores/libraryStore';
import { CollectionPickerSheet } from '../collections/CollectionPickerSheet';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { useSelection } from './useSelection';
import styles from './Library.module.css';

/** iOS edit-mode toolbar: acts on every selected comic at once. */
export function SelectionToolbar() {
  const { t } = useTranslation();
  const selection = useSelection();
  const ids = [...selection.selectedIds];
  const count = ids.length;
  const [picking, setPicking] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { setReadStatusMany, removeMany } = useLibraryStore.getState();

  const action = (icon: LucideIcon, label: string, onClick: () => void, destructive = false) => {
    const Icon = icon;
    return (
      <button
        type="button"
        className={`${styles.toolbarButton} ${destructive ? styles.toolbarDestructive : ''}`}
        disabled={count === 0}
        onClick={onClick}
      >
        <Icon size={22} strokeWidth={1.9} aria-hidden />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      <div className={styles.toolbar} role="toolbar" aria-label={t('library.selectionActions')}>
        {action(FolderPlus, t('library.toolbar.collection'), () => setPicking(true))}
        {action(BookCheck, t('library.toolbar.markRead'), () => {
          haptics.success();
          void setReadStatusMany(ids, true).then(selection.stop);
        })}
        {action(BookX, t('library.toolbar.markUnread'), () => {
          void setReadStatusMany(ids, false).then(selection.stop);
        })}
        {action(
          Trash2,
          t('library.toolbar.delete'),
          () => {
            haptics.warning();
            setConfirmingDelete(true);
          },
          true,
        )}
      </div>
      {picking && (
        <CollectionPickerSheet
          comicIds={ids}
          subtitle={t('library.selectedCount', { count })}
          onClose={() => setPicking(false)}
        />
      )}
      {confirmingDelete && (
        <ConfirmSheet
          title={t('library.removeManyConfirm', { count })}
          confirmLabel={t('library.removeShort')}
          cancelLabel={t('library.cancel')}
          destructive
          onConfirm={() => void removeMany(ids).then(selection.stop)}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
