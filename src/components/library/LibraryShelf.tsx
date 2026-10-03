import type { LibraryItem } from '../../modules/library/domain/LibraryItem';
import type { SeriesGroup } from '../../modules/library/domain/SeriesGroup';
import { useLibraryStore } from '../../stores/libraryStore';
import { ComicCard } from './ComicCard';
import { SeriesTile } from './SeriesTile';
import styles from './Library.module.css';

type ShelfProps = { groups: readonly SeriesGroup[] } | { items: readonly LibraryItem[] };

/**
 * Cover grid. With `groups`, series with several volumes appear as one stacked tile and
 * standalone comics as normal covers; with `items`, every comic is shown on its own.
 */
export function LibraryShelf(props: ShelfProps) {
  const { remove, setReadStatus } = useLibraryStore.getState();
  const card = (item: LibraryItem) => (
    <ComicCard
      key={item.getComic().getId()}
      item={item}
      onSetReadStatus={setReadStatus}
      onRemove={remove}
    />
  );

  return (
    <ul className={styles.grid}>
      {'groups' in props
        ? props.groups.map((group) =>
            group.isSingle() ? (
              card(group.getCoverItem())
            ) : (
              <SeriesTile key={group.getKey()} group={group} />
            ),
          )
        : props.items.map(card)}
    </ul>
  );
}
