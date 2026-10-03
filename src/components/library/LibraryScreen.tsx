import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFileDrop } from '../../hooks/useFileDrop';
import { useLibraryStore } from '../../stores/libraryStore';
import { HeaderLink } from '../common/HeaderLink';
import { ScreenHeader } from '../common/ScreenHeader';
import screenStyles from '../common/Screen.module.css';
import { AddComicsButton } from './AddComicsButton';
import { ComicCard } from './ComicCard';
import { ImportStatus } from './ImportStatus';
import styles from './Library.module.css';
import { LibraryToolbar } from './LibraryToolbar';

export function LibraryScreen() {
  const { t } = useTranslation();
  const items = useLibraryStore((state) => state.items);
  const status = useLibraryStore((state) => state.status);
  const query = useLibraryStore((state) => state.query);
  const sortOrder = useLibraryStore((state) => state.sortOrder);
  const importProgress = useLibraryStore((state) => state.importProgress);
  const importFailures = useLibraryStore((state) => state.importFailures);
  const {
    load,
    importFiles,
    remove,
    setReadStatus,
    setQuery,
    setSortOrder,
    dismissImportFailures,
  } = useLibraryStore.getState();

  // Reload on every visit so progress saved by the reader is reflected.
  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(
    () => items.search(query).sortBy(sortOrder).toArray(),
    [items, query, sortOrder],
  );

  const addFiles = (files: File[]) => void importFiles(files);
  const { isDragging, handlers } = useFileDrop(addFiles);
  const isImporting = importProgress !== null;

  return (
    <div className={styles.screen} {...handlers}>
      <ScreenHeader
        title={t('library.title')}
        end={
          <>
            {!items.isEmpty() && (
              <AddComicsButton onFiles={addFiles} disabled={isImporting} compact />
            )}
            <HeaderLink to="/settings" label={t('nav.settings')} icon="⚙" />
          </>
        }
      />
      <main className={screenStyles.content}>
        <ImportStatus
          progress={importProgress}
          failures={importFailures}
          onDismiss={dismissImportFailures}
        />

        {status === 'loading' && (
          <p className={screenStyles.muted} role="status">
            {t('library.loading')}
          </p>
        )}

        {status !== 'loading' && items.isEmpty() && (
          <section className={screenStyles.emptyState} aria-labelledby="library-empty">
            <p id="library-empty">{t('library.empty')}</p>
            <p className={screenStyles.muted}>{t('library.emptyHint')}</p>
            <AddComicsButton onFiles={addFiles} disabled={isImporting} />
          </section>
        )}

        {!items.isEmpty() && (
          <>
            <LibraryToolbar
              query={query}
              sortOrder={sortOrder}
              onQueryChange={setQuery}
              onSortOrderChange={setSortOrder}
            />
            <p className={styles.count}>{t('library.count', { count: visibleItems.length })}</p>
            {visibleItems.length === 0 ? (
              <p className={screenStyles.muted}>{t('library.noResults', { query })}</p>
            ) : (
              <ul className={styles.grid}>
                {visibleItems.map((item) => (
                  <ComicCard
                    key={item.getComic().getId()}
                    item={item}
                    onSetReadStatus={(comicId, isRead) => void setReadStatus(comicId, isRead)}
                    onRemove={(comicId) => void remove(comicId)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      {isDragging && (
        <div className={styles.dropOverlay} aria-hidden="true">
          <p>{t('library.dropHint')}</p>
        </div>
      )}
    </div>
  );
}
