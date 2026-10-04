import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../../i18n/formatBytes';
import {
  PAGE_QUALITIES,
  PageQuality,
  type PageQualityPrimitive,
} from '../../modules/archive/domain/PageQuality';
import { haptics } from '../../shared/infrastructure/haptics';
import { useLibraryStore } from '../../stores/libraryStore';
import { useOptimizationStore } from '../../stores/optimizationStore';
import controls from '../ui/Controls.module.css';
import { Sheet } from '../ui/Sheet';
import styles from './Library.module.css';

interface OptimizeSheetProps {
  comicIds: readonly string[];
  onClose: () => void;
  /** Called once the comics are queued (e.g. to leave selection mode). */
  onStarted?: () => void;
}

/** Choose a quality and queue comics to have their pages downscaled and recompressed. */
export function OptimizeSheet({ comicIds, onClose, onStarted }: OptimizeSheetProps) {
  const { t, i18n } = useTranslation();
  const sheetId = useId();
  const radioName = useId();
  const items = useLibraryStore((state) => state.items);
  const [quality, setQuality] = useState<PageQualityPrimitive>(PageQuality.default().toPrimitive());

  const comics = comicIds.flatMap((id) => items.findById(id)?.getComic() ?? []);
  const size = comics.reduce((total, comic) => total + comic.getStoredSize(), 0);
  const chosen = PageQuality.fromPrimitive(quality);
  const pending = comics.filter((comic) => !comic.isOptimizedAs(chosen));

  const start = () => {
    haptics.success();
    useOptimizationStore.getState().enqueue(
      pending.map((comic) => comic.getId()),
      chosen,
    );
    onStarted?.();
    document.getElementById(sheetId)?.hidePopover();
  };

  return (
    <Sheet
      id={sheetId}
      title={t('optimize.title')}
      closeLabel={t('library.cancel')}
      autoOpen
      onClose={onClose}
    >
      <div className={styles.infoForm}>
        <p className={styles.infoHint}>
          {t('optimize.subtitle', {
            count: comics.length,
            size: formatBytes(size, i18n.language),
          })}
        </p>
        <fieldset className={styles.choiceList}>
          <legend className={styles.visuallyHidden}>{t('optimize.quality')}</legend>
          {PAGE_QUALITIES.map((value) => (
            <label key={value} className={styles.choiceOption}>
              <input
                type="radio"
                name={radioName}
                value={value}
                checked={quality === value}
                onChange={() => setQuality(value)}
              />
              <span className={styles.choiceText}>
                <span className={styles.choiceLabel}>{t(`optimize.qualities.${value}.label`)}</span>
                <span className={styles.choiceDetail}>
                  {t(`optimize.qualities.${value}.detail`)}
                </span>
              </span>
              <Check size={20} strokeWidth={2.4} aria-hidden className={styles.choiceCheck} />
            </label>
          ))}
        </fieldset>
        <p className={styles.infoHint}>
          {pending.length === 0 ? t('optimize.alreadyDone') : t('optimize.explanation')}
        </p>
        <button
          type="button"
          className={controls.filledButton}
          disabled={pending.length === 0}
          onClick={start}
        >
          {t('optimize.start', { count: pending.length })}
        </button>
      </div>
    </Sheet>
  );
}
