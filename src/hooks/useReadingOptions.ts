import { useTranslation } from 'react-i18next';
import { FIT_MODES, type FitModePrimitive } from '../modules/reading/domain/FitMode';
import type { ReadingDirectionPrimitive } from '../modules/reading/domain/ReadingDirection';
import { READING_MODES, type ReadingModePrimitive } from '../modules/reading/domain/ReadingMode';
import {
  LANGUAGES,
  THEMES,
  type LanguagePreference,
  type Theme,
} from '../modules/settings/domain/Settings';

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Translated option lists for every preference, shared by Settings and the reader sheet. */
export function useReadingOptions(): {
  modes: Option<ReadingModePrimitive>[];
  directions: Option<ReadingDirectionPrimitive>[];
  fits: Option<FitModePrimitive>[];
  themes: Option<Theme>[];
  languages: Option<LanguagePreference>[];
} {
  const { t } = useTranslation();
  return {
    modes: READING_MODES.map((value) => ({ value, label: t(`reader.mode.${value}`) })),
    directions: (['rtl', 'ltr'] as const).map((value) => ({
      value,
      label: t(`reader.direction.${value}`),
    })),
    fits: FIT_MODES.map((value) => ({ value, label: t(`reader.fit.${value}`) })),
    themes: THEMES.map((value) => ({ value, label: t(`settings.themes.${value}`) })),
    languages: LANGUAGES.map((value) => ({ value, label: t(`settings.languages.${value}`) })),
  };
}
