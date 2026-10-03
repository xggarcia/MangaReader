import { ArrowUpDown, BookOpen, Plus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFileDrop } from '../../hooks/useFileDrop';
import { useFilePicker } from '../../hooks/useFilePicker';
import { LIBRARY_SORT_ORDERS } from '../../modules/library/domain/LibraryItemList';
import { useLibraryStore } from '../../stores/libraryStore';
import { BarButton } from '../ui/BarButton';
import controls from '../ui/Controls.module.css';
import { LargeTitleScreen } from '../ui/LargeTitleScreen';
import { Menu } from '../ui/Menu';
import { SearchField } from '../ui/SearchField';
import { ComicGrid } from './ComicGrid';
import { ContinueReadingCard } from './ContinueReadingCard';
import { ImportStatus } from './ImportStatus';
import styles from './Library.module.css';

export function LibraryScreen() {
  const { t } = useTranslation();
  const items = useLibraryStore((state) => state.items);
  const status = useLibraryStore((state) => state.status);
  const query = useLibraryStore((state) => state.query);
  const sortOrder = useLibraryStore((state) => state.sortOrder);
  const importProgress = useLibraryStore((state) => state.importProgress);
  const importFailures = useLibraryStore((state) => state.importFailures);
  const { load, importFiles, setQuery, setSortOrder, dismissImportFailures } =
    useLibraryStore.getState();

  // Reload on every visit so progress saved by the reader is reflected.
  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(
    () => items.search(query).sortBy(sortOrder).toArray(),
    [items, query, sortOrder],
  );
  const continueItem = useMemo(() => (query ? null : items.continueReading()), [items, query]);

  const addFiles = (files: File[]) => void importFiles(files);
  const { openPicker, pickerInput } = useFilePicker(addFiles);
  const { isDragging, handlers } = useFileDrop(addFiles);
  const isImporting = importProgress !== null;
  const isEmpty = status !== 'loading' && items.isEmpty();

  return (
    <div {...handlers}>
      <LargeTitleScreen
        title={t('library.title')}
        trailing={
          <>
            {!items.isEmpty() && (
              <Menu
                label={t('library.sortBy')}
                items={LIBRARY_SORT_ORDERS.map((order) => ({
                  id: order,
                  label: t(`library.sort.${order}`),
                  checked: order === sortOrder,
                  onSelect: () => setSortOrder(order),
                }))}
                trigger={(triggerProps) => (
                  <BarButton label={t('library.sortBy')} {...triggerProps}>
                    <ArrowUpDown size={21} strokeWidth={2} aria-hidden />
                  </BarButton>
                )}
              />
            )}
            <BarButton label={t('library.add')} onClick={openPicker} disabled={isImporting}>
              <Plus size={26} strokeWidth={2} aria-hidden />
            </BarButton>
          </>
        }
        header={
          !items.isEmpty() && (
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t('library.searchPlaceholder')}
              label={t('library.search')}
              clearLabel={t('library.clearSearch')}
            />
          )
        }
      >
        {pickerInput}
        <ImportStatus
          progress={importProgress}
          failures={importFailures}
          onDismiss={dismissImportFailures}
        />

        {isEmpty && (
          <section className={styles.empty} aria-labelledby="library-empty">
            <BookOpen size={56} strokeWidth={1.25} aria-hidden className={styles.emptyIcon} />
            <h2 id="library-empty" className={styles.emptyTitle}>
              {t('library.empty')}
            </h2>
            <p className={styles.emptyText}>{t('library.emptyHint')}</p>
            <button
              type="button"
              className={controls.filledButton}
              onClick={openPicker}
              disabled={isImporting}
            >
              {t('library.add')}
            </button>
          </section>
        )}

        {continueItem && <ContinueReadingCard item={continueItem} />}

        {!items.isEmpty() && (
          <>
            <h2 className={styles.gridHeading}>
              {t('library.allComics')}
              <span className={styles.count}>{visibleItems.length}</span>
            </h2>
            {visibleItems.length === 0 ? (
              <p className={styles.noResults}>{t('library.noResults', { query })}</p>
            ) : (
              <ComicGrid items={visibleItems} />
            )}
          </>
        )}
      </LargeTitleScreen>
      {isDragging && (
        <div className={styles.dropOverlay} aria-hidden="true">
          <p>{t('library.dropHint')}</p>
        </div>
      )}
    </div>
  );
}
