import { Folders, LibraryBig, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { TabBar, type TabItem } from '../components/ui/TabBar';

/** Main sections with the iOS tab bar; the reader lives outside it, full screen. */
export function ShellLayout() {
  const { t } = useTranslation();
  const tabs: TabItem[] = [
    { path: '/', label: t('tabs.library'), icon: LibraryBig, alsoActiveOn: ['/series/'] },
    { path: '/collections', label: t('tabs.collections'), icon: Folders },
    { path: '/settings', label: t('tabs.settings'), icon: Settings },
  ];
  return (
    <>
      <Outlet />
      <TabBar tabs={tabs} label={t('tabs.label')} />
    </>
  );
}
