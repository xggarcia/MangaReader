import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { haptics } from '../../shared/infrastructure/haptics';

import { SelectionContext } from './useSelection';

/** Multi-select state for a screen of covers (select several comics or whole series). */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const start = useCallback(() => {
    haptics.selection();
    setActive(true);
  }, []);
  const stop = useCallback(() => {
    setActive(false);
    setSelectedIds(new Set());
  }, []);
  const toggle = useCallback((comicIds: readonly string[]) => {
    haptics.selection();
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = comicIds.every((id) => next.has(id));
      for (const id of comicIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);
  const isSelected = useCallback(
    (comicIds: readonly string[]) =>
      comicIds.length > 0 && comicIds.every((id) => selectedIds.has(id)),
    [selectedIds],
  );

  const value = useMemo(
    () => ({ active, selectedIds, start, stop, toggle, isSelected }),
    [active, selectedIds, start, stop, toggle, isSelected],
  );
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}
