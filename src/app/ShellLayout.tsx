import { Capacitor } from '@capacitor/core';
import { Folders, LibraryBig, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import { TabBar, type TabItem } from '../components/ui/TabBar';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';

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

  // Android has the system Back gesture; on iOS pushed screens close with an edge swipe.
  useEdgeSwipeBack(Capacitor.getPlatform() === 'ios' && !TAB_ROOTS.has(pathname));

  return (
    <>
      <Outlet />
      <TabBar tabs={tabs} label={t('tabs.label')} />
    </>
  );
}
