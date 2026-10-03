import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useAndroidBackButton } from '../hooks/useAndroidBackButton';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../stores/settingsStore';

export function RootLayout() {
  const theme = useSettingsStore((state) => state.settings.getTheme());
  const loaded = useSettingsStore((state) => state.loaded);

  useEffect(() => {
    void useSettingsStore.getState().load();
  }, []);

  useAndroidBackButton();
  useTheme(theme);

  // Wait for stored preferences so the reader opens with the right mode and direction.
  return loaded ? <Outlet /> : null;
}
