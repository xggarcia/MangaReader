import { Outlet } from 'react-router';
import { useAndroidBackButton } from '../hooks/useAndroidBackButton';
import { useTheme } from '../hooks/useTheme';

export function RootLayout() {
  useAndroidBackButton();
  // Theme preference will come from the settings store (milestone 5).
  useTheme('system');
  return <Outlet />;
}
