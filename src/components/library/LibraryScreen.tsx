import { BookOpen, CircleCheck, Ellipsis, Layers, Plus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFileDrop } from '../../hooks/useFileDrop';
import { useFilePicker } from '../../hooks/useFilePicker';
import {
  LIBRARY_FILTERS,
  LIBRARY_SORT_ORDERS,
  type LibraryFilter,
} from '../../modules/library/domain/LibraryItemList';
import { useLibraryStore } from '../../stores/libraryStore';
import { SegmentedControl } from '../common/SegmentedControl';
import { BarButton } from '../ui/BarButton';
import controls from '../ui/Controls.module.css';
import { LargeTitleScreen } from '../ui/LargeTitleScreen';
import { Menu, type MenuItem } from '../ui/Menu';
import { SearchField } from '../ui/SearchField';
import { ContinueReadingCard } from './ContinueReadingCard';
import { ImportStatus } from './ImportStatus';
import { LibraryShelf } from './LibraryShelf';
import { SelectionProvider } from './SelectionContext';
import { useSelection } from './useSelection';
import { SelectionToolbar } from './SelectionToolbar';
import styles from './Library.module.css';

export function LibraryScreen() {
  return (
    <SelectionProvider>
      <LibraryContent />
    </SelectionProvider>
  );
}

function LibraryContent() {
  const { t } = useTranslation();
  const items = useLibraryStore((state) => state.items);
  const status = useLibraryStore((state) => state.status);
  const query = useLibraryStore((state) => state.query);
  const sortOrder = useLibraryStore((state) => state.sortOrder);
  const filter = useLibraryStore((state) => state.filter);
  const groupSeries = useLibraryStore((state) => state.groupSeries);
  const importProgress = useLibraryStore((state) => state.importProgress);
  const importFailures = useLibraryStore((state) => state.importFailures);
  const {
    load,
    importFiles,
    setQuery,
    setSortOrder,
    setFilter,
    setGroupSeries,
    dismissImportFailures,
  } = useLibraryStore.getState();
  const selection = useSelection();

  // Reload on every visit so progress saved by the reader is reflected.
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => items.search(query).filterByStatus(filter),
    [items, query, filter],
  );
  const groups = useMemo(
    () => (groupSeries ? filtered.groupBySeries(sortOrder) : null),
    [filtered, groupSeries, sortOrder],
  );
  const flatItems = useMemo(
    () => (groupSeries ? [] : filtered.sortBy(sortOrder).toArray()),
    [filtered, groupSeries, sortOrder],
  );
  const continueItem = useMemo(
    () => (query || filter !== 'all' ? null : items.continueReading()),
    [items, query, filter],
  );

  const addFiles = (files: File[]) => void importFiles(files);
  const { openPicker, pickerInput } = useFilePicker(addFiles);
  const { isDragging, handlers } = useFileDrop(addFiles);
  const isImporting = importProgress !== null;
  const isEmpty = status !== 'loading' && items.isEmpty();

  const optionItems: MenuItem[] = [
    { id: 'select', label: t('library.select'), icon: CircleCheck, onSelect: selection.start },
    {
      id: 'group',
      label: t('library.groupSeries'),
      icon: Layers,
      checked: groupSeries,
      dividerBefore: true,
      onSelect: () => setGroupSeries(!groupSeries),
    },
    ...LIBRARY_SORT_ORDERS.map((order, index) => ({
      id: order,
      label: t(`library.sort.${order}`),
      checked: order === sortOrder,
      dividerBefore: index === 0,
      onSelect: () => setSortOrder(order),
    })),
  ];

  const trailing = selection.active ? (
    <button type="button" className={styles.doneButton} onClick={selection.stop}>
      {t('library.selectDone')}
    </button>
  ) : (
    <>
      {!items.isEmpty() && (
        <Menu
          label={t('library.options')}
          items={optionItems}
          trigger={(triggerProps) => (
            <BarButton label={t('library.options')} {...triggerProps}>
              <Ellipsis size={24} strokeWidth={2.2} aria-hidden />
            </BarButton>
          )}
        />
      )}
      <BarButton label={t('library.add')} onClick={openPicker} disabled={isImporting}>
        <Plus size={26} strokeWidth={2} aria-hidden />
      </BarButton>
    </>
  );

  const shownCount = filtered.count();

  return (
    <div {...handlers}>
      <LargeTitleScreen
        title={
          selection.active
            ? t('library.selectedCount', { count: selection.selectedIds.size })
            : t('library.title')
        }
        trailing={trailing}
        header={
          !items.isEmpty() && (
            <div className={styles.headerControls}>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder={t('library.searchPlaceholder')}
                label={t('library.search')}
                clearLabel={t('library.clearSearch')}
              />
              <SegmentedControl<LibraryFilter>
                legend={t('library.filterLabel')}
                hideLegend
                value={filter}
                options={LIBRARY_FILTERS.map((value) => ({
                  value,
                  label: t(`library.filter.${value}`),
                }))}
                onChange={setFilter}
              />
            </div>
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

        {continueItem && !selection.active && <ContinueReadingCard item={continueItem} />}

        {!items.isEmpty() && (
          <>
            <h2 className={styles.gridHeading}>
              {t(`library.heading.${filter}`)}
              <span className={styles.count}>{shownCount}</span>
            </h2>
            {shownCount === 0 ? (
              <p className={styles.noResults}>
                {query ? t('library.noResults', { query }) : t(`library.emptyFilter.${filter}`)}
              </p>
            ) : groups ? (
              <LibraryShelf groups={groups} />
            ) : (
              <LibraryShelf items={flatItems} />
            )}
          </>
        )}
      </LargeTitleScreen>
      {selection.active && <SelectionToolbar />}
      {isDragging && (
        <div className={styles.dropOverlay} aria-hidden="true">
          <p>{t('library.dropHint')}</p>
        </div>
      )}
    </div>
  );
}
