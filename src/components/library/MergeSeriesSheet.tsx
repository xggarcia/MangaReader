import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SeriesInfo } from '../../modules/library/domain/SeriesInfo';
import { haptics } from '../../shared/infrastructure/haptics';
import { useLibraryStore } from '../../stores/libraryStore';
import controls from '../ui/Controls.module.css';
import { SearchField } from '../ui/SearchField';
import { Sheet } from '../ui/Sheet';
import styles from './Library.module.css';

const CUSTOM_NAME = 'custom-name';
const SEARCH_THRESHOLD = 6;

interface MergeSeriesSheetProps {
  title: string;
  /** Comics to put into one series: a selection, or every volume of a series. */
  comicIds: readonly string[];
  /** When set, lists the other series to add to this one, most alike names first. */
  fromSeriesKey?: string;
  onClose: () => void;
  /** Called with the key of the resulting series. */
  onMerged?: (seriesKey: string) => void;
}

/**
 * Joins series that were detected apart into one (or renames a series): pick the series to
 * add, then the name they all share. Each volume keeps its number and place.
 */
export function MergeSeriesSheet({
  title,
  comicIds,
  fromSeriesKey,
  onClose,
  onMerged,
}: MergeSeriesSheetProps) {
  const { t } = useTranslation();
  const sheetId = useId();
  const radioName = useId();
  const items = useLibraryStore((state) => state.items);
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState('');
  const [nameChoice, setNameChoice] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);

  const candidates = fromSeriesKey ? items.findMergeCandidates(fromSeriesKey) : [];
  const addedGroups = candidates.filter((group) => added.has(group.getKey()));
  const involved = [
    ...comicIds.flatMap((id) => items.findById(id) ?? []),
    ...addedGroups.flatMap((group) => group.getVolumes()),
  ];

  // Every series involved, the one with most volumes first: its name is the default.
  const seriesByKey = new Map<string, { series: SeriesInfo; volumes: number }>();
  for (const item of involved) {
    const series = item.getSeries();
    const entry = seriesByKey.get(series.getKey());
    seriesByKey.set(series.getKey(), { series, volumes: (entry?.volumes ?? 0) + 1 });
  }
  const names = [...seriesByKey.values()]
    .sort((a, b) => b.volumes - a.volumes)
    .map(({ series }) => series.getName());
  const seriesCount = names.length;

  const customSelected = nameChoice === CUSTOM_NAME;
  const presetName = nameChoice && names.includes(nameChoice) ? nameChoice : (names[0] ?? '');
  const selectedName = customSelected ? customName.trim() : presetName;
  const merging = seriesCount > 1;
  const unchanged = !merging && selectedName === names[0];
  const search = query.trim().toLocaleLowerCase();
  const visibleCandidates = search
    ? candidates.filter((group) => group.getName().toLocaleLowerCase().includes(search))
    : candidates;

  const toggle = (key: string) => {
    setAdded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    if (!selectedName || unchanged || saving) return;
    setSaving(true);
    haptics.success();
    const key = await useLibraryStore.getState().mergeSeries(
      involved.map((item) => item.getComic().getId()),
      selectedName,
    );
    document.getElementById(sheetId)?.hidePopover();
    onMerged?.(key);
  };

  return (
    <Sheet id={sheetId} title={title} closeLabel={t('library.cancel')} autoOpen onClose={onClose}>
      <form
        className={styles.infoForm}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <p className={styles.infoHint}>
          {[
            t('mergeSeries.seriesCount', { count: seriesCount }),
            t('library.volumes', { count: involved.length }),
          ].join(' · ')}
        </p>

        {fromSeriesKey && (
          <fieldset className={styles.choiceGroup}>
            <legend className={styles.choiceHeading}>{t('mergeSeries.addHeading')}</legend>
            {candidates.length > SEARCH_THRESHOLD && (
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder={t('mergeSeries.search')}
                label={t('mergeSeries.search')}
                clearLabel={t('library.clearSearch')}
              />
            )}
            {candidates.length === 0 ? (
              <p className={styles.infoHint}>{t('mergeSeries.noOthers')}</p>
            ) : (
              <div className={styles.choiceList}>
                {visibleCandidates.map((group) => (
                  <label key={group.getKey()} className={styles.choiceOption}>
                    <input
                      type="checkbox"
                      checked={added.has(group.getKey())}
                      onChange={() => toggle(group.getKey())}
                    />
                    <span className={styles.choiceText}>
                      <span className={styles.choiceLabel}>{group.getName()}</span>
                      <span className={styles.choiceDetail}>
                        {t('library.volumes', { count: group.count() })}
                      </span>
                    </span>
                    <Check size={20} strokeWidth={2.4} aria-hidden className={styles.choiceCheck} />
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}

        <fieldset className={styles.choiceGroup}>
          <legend className={styles.choiceHeading}>{t('mergeSeries.nameHeading')}</legend>
          <div className={styles.choiceList}>
            {names.map((name) => (
              <label key={name} className={styles.choiceOption}>
                <input
                  type="radio"
                  name={radioName}
                  checked={!customSelected && presetName === name}
                  onChange={() => setNameChoice(name)}
                />
                <span className={styles.choiceText}>
                  <span className={styles.choiceLabel}>{name}</span>
                </span>
                <Check size={20} strokeWidth={2.4} aria-hidden className={styles.choiceCheck} />
              </label>
            ))}
            <label className={styles.choiceOption}>
              <input
                type="radio"
                name={radioName}
                checked={customSelected}
                onChange={() => setNameChoice(CUSTOM_NAME)}
              />
              <input
                type="text"
                className={styles.choiceInput}
                value={customName}
                placeholder={t('mergeSeries.otherName')}
                aria-label={t('mergeSeries.otherName')}
                autoComplete="off"
                onFocus={() => setNameChoice(CUSTOM_NAME)}
                onChange={(event) => setCustomName(event.target.value)}
              />
              <Check size={20} strokeWidth={2.4} aria-hidden className={styles.choiceCheck} />
            </label>
          </div>
        </fieldset>

        <p className={styles.infoHint}>{t('mergeSeries.hint')}</p>
        <button
          type="submit"
          className={controls.filledButton}
          disabled={!selectedName || unchanged || saving}
        >
          {merging
            ? t('mergeSeries.merge', { count: seriesCount })
            : fromSeriesKey && !customSelected
              ? t('mergeSeries.pickSeries')
              : t('mergeSeries.saveName')}
        </button>
      </form>
    </Sheet>
  );
}
