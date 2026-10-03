import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LibraryItem } from '../../modules/library/domain/LibraryItem';
import { haptics } from '../../shared/infrastructure/haptics';
import { useLibraryStore } from '../../stores/libraryStore';
import controls from '../ui/Controls.module.css';
import { Sheet } from '../ui/Sheet';
import styles from './Library.module.css';

/**
 * Edit a comic's title, series and volume. The series decides which stack the comic joins,
 * so this fixes a wrongly detected series (or moves a volume into another one).
 */
export function ComicInfoSheet({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const { t } = useTranslation();
  const sheetId = useId();
  const comic = item.getComic();
  const detected = item.getSeries();
  const [title, setTitle] = useState(comic.getTitle());
  const [series, setSeries] = useState(comic.getSeries() ?? detected.getName());
  const [number, setNumber] = useState(
    comic.getNumber() ?? (detected.getVolume() !== null ? String(detected.getVolume()) : ''),
  );
  const ids = { title: useId(), series: useId(), number: useId() };

  const save = () => {
    if (!title.trim()) return;
    haptics.success();
    void useLibraryStore.getState().updateInfo(comic.getId(), {
      title: title.trim(),
      series: series.trim() || null,
      number: number.trim() || null,
    });
    document.getElementById(sheetId)?.hidePopover();
  };

  return (
    <Sheet
      id={sheetId}
      title={t('library.editInfo')}
      closeLabel={t('library.cancel')}
      autoOpen
      onClose={onClose}
    >
      <form
        className={styles.infoForm}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className={styles.infoFields}>
          <label htmlFor={ids.title}>{t('library.fieldTitle')}</label>
          <input
            id={ids.title}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoComplete="off"
          />
          <label htmlFor={ids.series}>{t('library.fieldSeries')}</label>
          <input
            id={ids.series}
            value={series}
            onChange={(event) => setSeries(event.target.value)}
            autoComplete="off"
          />
          <label htmlFor={ids.number}>{t('library.fieldVolume')}</label>
          <input
            id={ids.number}
            value={number}
            inputMode="decimal"
            onChange={(event) => setNumber(event.target.value)}
            autoComplete="off"
          />
        </div>
        <p className={styles.infoHint}>{t('library.editInfoHint')}</p>
        <button type="submit" className={controls.filledButton} disabled={!title.trim()}>
          {t('collections.save')}
        </button>
      </form>
    </Sheet>
  );
}
