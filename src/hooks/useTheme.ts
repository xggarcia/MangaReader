import { useEffect } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

/** Applies the theme preference to the document; `system` defers to prefers-color-scheme in CSS. */
export function useTheme(preference: ThemePreference): void {
  useEffect(() => {
    const root = document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
  }, [preference]);
}
