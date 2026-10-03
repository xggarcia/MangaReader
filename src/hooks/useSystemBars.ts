import { useEffect } from 'react';
import type { Theme } from '../modules/settings/domain/Settings';
import { setSystemBarsStyle } from '../shared/infrastructure/nativeSystemUi';

// The app theme decides the bar icon colour unless a full-screen view (the reader) overrides it.
let themeDarkIcons = true;
let override: boolean | null = null;

function apply(): void {
  void setSystemBarsStyle(override ?? themeDarkIcons);
}

/** Keeps the status/navigation bar icons readable for the current theme. */
export function useThemeSystemBars(theme: Theme): void {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      themeDarkIcons = !dark;
      apply();
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [theme]);
}

/** Light bar icons over the black reader; restores the theme's style on unmount. */
export function useDarkContentSystemBars(): void {
  useEffect(() => {
    override = false;
    apply();
    return () => {
      override = null;
      apply();
    };
  }, []);
}
