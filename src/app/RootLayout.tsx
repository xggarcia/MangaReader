import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useAndroidBackButton } from '../hooks/useAndroidBackButton';
import { useDeviceFileEvents } from '../hooks/useDeviceFileEvents';
import { useThemeSystemBars } from '../hooks/useSystemBars';
import { useTheme } from '../hooks/useTheme';
import i18n, { detectSystemLanguage } from '../i18n';
import { useSettingsStore } from '../stores/settingsStore';

export function RootLayout() {
  const theme = useSettingsStore((state) => state.settings.getTheme());
  const language = useSettingsStore((state) => state.settings.getLanguage());
  const loaded = useSettingsStore((state) => state.loaded);

  useEffect(() => {
    void useSettingsStore.getState().load();
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(language === 'system' ? detectSystemLanguage() : language);
  }, [language]);

  useAndroidBackButton();
  // After settings load: imports depend on them (reduce on import, delete originals).
  useDeviceFileEvents(loaded);
  useTheme(theme);
  useThemeSystemBars(theme);

  // Wait for stored preferences so the reader opens with the right mode and direction.
  return loaded ? <Outlet /> : null;
}
