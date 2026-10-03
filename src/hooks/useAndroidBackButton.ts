import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useLocation } from 'react-router';
import { goBack, goTo } from '../app/navigation';

/** Tabs live side by side: Back from another tab returns to the library instead of popping. */
const TAB_PATHS = new Set(['/collections', '/settings']);

/**
 * Maps the Android hardware back button: closes an open sheet or menu first, then returns to
 * the library from other tabs, goes back from pushed screens, and exits from the library.
 */
export function useAndroidBackButton(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener('backButton', () => {
      const openLayer = document.querySelector<HTMLElement>(':popover-open');
      if (openLayer) {
        openLayer.hidePopover();
      } else if (pathname === '/') {
        void App.exitApp();
      } else if (TAB_PATHS.has(pathname)) {
        goTo('/', 'tab', { replace: true });
      } else {
        goBack();
      }
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [pathname]);
}
