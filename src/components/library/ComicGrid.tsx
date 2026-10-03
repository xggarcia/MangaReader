import type { LibraryItem } from '../../modules/library/domain/LibraryItem';
import { useLibraryStore } from '../../stores/libraryStore';
import { ComicCard } from './ComicCard';
import styles from './Library.module.css';

/** Cover grid shared by the library and collection screens. */
export function ComicGrid({ items }: { items: readonly LibraryItem[] }) {
  const { remove, setReadStatus } = useLibraryStore.getState();
  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <ComicCard
          key={item.getComic().getId()}
          item={item}
          onSetReadStatus={setReadStatus}
          onRemove={remove}
        />
      ))}
    </ul>
  );
}
