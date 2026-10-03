import { useTranslation } from 'react-i18next';
import {
  LIBRARY_SORT_ORDERS,
  LibraryItemList,
  type LibrarySortOrder,
} from '../../modules/library/domain/LibraryItemList';
import styles from './Library.module.css';

interface LibraryToolbarProps {
  query: string;
  sortOrder: LibrarySortOrder;
  onQueryChange: (query: string) => void;
  onSortOrderChange: (sortOrder: LibrarySortOrder) => void;
}

export function LibraryToolbar({
  query,
  sortOrder,
  onQueryChange,
  onSortOrderChange,
}: LibraryToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <label className={styles.searchField}>
        <span className="visually-hidden">{t('library.search')}</span>
        <input
          type="search"
          value={query}
          placeholder={t('library.searchPlaceholder')}
          onChange={(event) => onQueryChange(event.target.value)}
          enterKeyHint="search"
          autoComplete="off"
        />
      </label>
      <label className={styles.sortField}>
        <span className="visually-hidden">{t('library.sortBy')}</span>
        <select
          value={sortOrder}
          onChange={(event) => {
            if (LibraryItemList.isSortOrder(event.target.value)) {
              onSortOrderChange(event.target.value);
            }
          }}
        >
          {LIBRARY_SORT_ORDERS.map((order) => (
            <option key={order} value={order}>
              {t(`library.sort.${order}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
