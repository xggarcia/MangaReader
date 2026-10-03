import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { goTo } from '../../app/navigation';
import { useCoverUrl } from '../../hooks/useCoverUrl';
import type { Collection } from '../../modules/library/domain/Collection';
import { COLLECTION_COLOR_VALUES } from './collectionColors';
import styles from './Collections.module.css';

const STACK_SIZE = 3;

function StackedCover({ comicId, index }: { comicId: string; index: number }) {
  const url = useCoverUrl(comicId);
  return (
    <span className={styles.stackCover} data-index={index}>
      {url && <img src={url} alt="" draggable={false} />}
    </span>
  );
}

/** Collection tile: its colour as a soft ground with up to three covers fanned on top. */
export function CollectionTile({ collection }: { collection: Collection }) {
  const { t } = useTranslation();
  const comicIds = collection.getComicIds().slice(0, STACK_SIZE);
  const color = COLLECTION_COLOR_VALUES[collection.getColor()];

  return (
    <li>
      <button
        type="button"
        className={styles.tile}
        onClick={() => goTo(`/collections/${collection.getId()}`, 'forward')}
      >
        <span className={styles.tileArt} style={{ '--tint': color } as CSSProperties}>
          {comicIds.length === 0 ? (
            <span className={styles.tileEmpty} aria-hidden="true" />
          ) : (
            comicIds
              .map((comicId, index) => (
                <StackedCover key={comicId} comicId={comicId} index={index} />
              ))
              .reverse()
          )}
        </span>
        <span className={styles.tileName}>{collection.getName()}</span>
        <span className={styles.tileCount}>
          {t('collections.count', { count: collection.count() })}
        </span>
      </button>
    </li>
  );
}
