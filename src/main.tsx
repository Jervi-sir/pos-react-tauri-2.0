// main.tsx
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { StrictMode } from 'react';
import App from './App';
import SqlQueriesPage from './pages/sql-queries/page';
import AppLayout from './layouts/layout';
import './App.css';
import CategoriesPage from './pages/categories/page';
import InvoicesPage from './pages/invoices/page';
import StocksPage from './pages/stocks/page';
import UsersPage from './pages/users/page';
import PosPage from './pages/pos/page';
import SalesListPage from './pages/sales/page';
import { AuthProvider } from './auth/auth-context';
import { ThemeProvider } from './components/theme-provider';
import AnalyticsPage from './pages/analytics/page';
import { initDatabase } from './lib/init-database';
import SettingsPage from './pages/settings/page';

(async () => {
  await initDatabase();
})().catch(console.error);

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <App /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/invoices', element: <InvoicesPage /> },
      { path: '/sales', element: <SalesListPage /> },
      { path: '/pos', element: <PosPage /> },
      { path: '/stocks', element: <StocksPage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/sql', element: <SqlQueriesPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);