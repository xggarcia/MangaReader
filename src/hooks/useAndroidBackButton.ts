import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useLocation, useNavigate } from 'react-router';

/** Maps the Android hardware back button to router history; exits the app from the root screen. */
export function useAndroidBackButton(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener('backButton', () => {
      if (pathname === '/') {
        void App.exitApp();
      } else {
        void navigate(-1);
      }
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [navigate, pathname]);
}
