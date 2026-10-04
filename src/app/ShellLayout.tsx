import { Capacitor } from '@capacitor/core';
import { Folders, LibraryBig, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import { ImportLibrarySheet } from '../components/library/ImportLibrarySheet';
import { OptimizationStatus } from '../components/library/OptimizationStatus';
import { TabBar, type TabItem } from '../components/ui/TabBar';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { isAppleMobile, isInstalledWebApp } from '../shared/infrastructure/webApp';

const TAB_ROOTS = new Set(['/', '/collections', '/settings']);

/** Main sections with the iOS tab bar; the reader lives outside it, full screen. */
export function ShellLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const tabs: TabItem[] = [
    { path: '/', label: t('tabs.library'), icon: LibraryBig, alsoActiveOn: ['/series/'] },
    { path: '/collections', label: t('tabs.collections'), icon: Folders },
    { path: '/settings', label: t('tabs.settings'), icon: Settings },
  ];

  // Android and browsers have their own Back; the iOS app and the iOS home-screen web app
  // do not, so pushed screens close with an edge swipe there.
  const iosWithoutBack =
    Capacitor.getPlatform() === 'ios' || (isAppleMobile() && isInstalledWebApp());
  useEdgeSwipeBack(iosWithoutBack && !TAB_ROOTS.has(pathname));

  return (
    <>
      <Outlet />
      <OptimizationStatus />
      <ImportLibrarySheet />
      <TabBar tabs={tabs} label={t('tabs.label')} />
    </>
  );
}
