import '@fontsource-variable/inter/opsz.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The DOM build applies navigations with flushSync, which view transitions need.
import { RouterProvider } from 'react-router/dom';
import '../i18n';
import '../styles/global.css';
import { registerOfflineSupport } from '../shared/infrastructure/webApp';
import { registerRouter } from './navigation';
import { router } from './router';

registerRouter(router);
void registerOfflineSupport();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
