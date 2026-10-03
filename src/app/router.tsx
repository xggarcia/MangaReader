import { createHashRouter } from 'react-router';
import { LibraryScreen } from '../components/library/LibraryScreen';
import { ReaderScreen } from '../components/reader/ReaderScreen';
import { SettingsScreen } from '../components/settings/SettingsScreen';
import { RootLayout } from './RootLayout';

// Hash history: the WebView serves static files only, so no server-side route fallback is needed.
export const router = createHashRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LibraryScreen /> },
      { path: '/read/:comicId', element: <ReaderScreen /> },
      { path: '/settings', element: <SettingsScreen /> },
    ],
  },
]);
