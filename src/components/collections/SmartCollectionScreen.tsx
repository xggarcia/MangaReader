import { ChevronLeft } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { goBack } from '../../app/navigation';
import { READ_STATUSES, type ReadStatus } from '../../modules/library/domain/LibraryItem';
import { useLibraryStore } from '../../stores/libraryStore';
import { LibraryShelf } from '../library/LibraryShelf';
import libraryStyles from '../library/Library.module.css';
import { LargeTitleScreen } from '../ui/LargeTitleScreen';
import styles from './Collections.module.css';

function isReadStatus(value: string): value is ReadStatus {
  return (READ_STATUSES as readonly string[]).includes(value);
}

/** Automatic collection by reading state (reading, unread, finished), grouped by series. */
export function SmartCollectionScreen() {
  const { t } = useTranslation();
  const { status = '' } = useParams();
  const items = useLibraryStore((state) => state.items);

  useEffect(() => {
    void useLibraryStore.getState().load();
  }, []);

  const readStatus: ReadStatus = isReadStatus(status) ? status : 'unread';
  const groups = useMemo(
    () => items.filterByStatus(readStatus).groupBySeries('lastRead'),
    [items, readStatus],
  );
  const count = groups.reduce((sum, group) => sum + group.count(), 0);

  return (
    <LargeTitleScreen
      title={t(`collections.smart.${readStatus}`)}
      leading={
        <button type="button" className={styles.backButton} onClick={goBack}>
          <ChevronLeft size={28} strokeWidth={2.2} aria-hidden />
          <span>{t('collections.title')}</span>
        </button>
      }
    >
      <p className={styles.detailCount}>{t('collections.count', { count })}</p>
      {count === 0 ? (
        <p className={libraryStyles.noResults}>{t(`library.emptyFilter.${readStatus}`)}</p>
      ) : (
        <LibraryShelf groups={groups} />
      )}
    </LargeTitleScreen>
  );
}
