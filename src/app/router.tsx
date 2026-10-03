import { createHashRouter } from 'react-router';
import { CollectionDetailScreen } from '../components/collections/CollectionDetailScreen';
import { CollectionsScreen } from '../components/collections/CollectionsScreen';
import { SmartCollectionScreen } from '../components/collections/SmartCollectionScreen';
import { LibraryScreen } from '../components/library/LibraryScreen';
import { SeriesScreen } from '../components/library/SeriesScreen';
import { ReaderScreen } from '../components/reader/ReaderScreen';
import { SettingsScreen } from '../components/settings/SettingsScreen';
import { RootLayout } from './RootLayout';
import { ShellLayout } from './ShellLayout';

// Hash history: the WebView serves static files only, so no server-side route fallback is needed.
export const router = createHashRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <ShellLayout />,
        children: [
          { path: '/', element: <LibraryScreen /> },
          { path: '/series/:seriesKey', element: <SeriesScreen /> },
          { path: '/collections', element: <CollectionsScreen /> },
          { path: '/collections/smart/:status', element: <SmartCollectionScreen /> },
          { path: '/collections/:collectionId', element: <CollectionDetailScreen /> },
          { path: '/settings', element: <SettingsScreen /> },
        ],
      },
      { path: '/read/:comicId', element: <ReaderScreen /> },
    ],
  },
]);
