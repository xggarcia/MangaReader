import { createContext, useContext } from 'react';

export interface Selection {
  active: boolean;
  selectedIds: ReadonlySet<string>;
  start: () => void;
  stop: () => void;
  /** Selects the comics, or deselects them when all are already selected (series tiles). */
  toggle: (comicIds: readonly string[]) => void;
  isSelected: (comicIds: readonly string[]) => boolean;
}

export const SelectionContext = createContext<Selection | null>(null);

/** Current selection, or an inactive one outside a provider (e.g. inside collections). */
export function useSelection(): Selection {
  return (
    useContext(SelectionContext) ?? {
      active: false,
      selectedIds: new Set(),
      start: () => undefined,
      stop: () => undefined,
      toggle: () => undefined,
      isSelected: () => false,
    }
  );
}
