// main.tsx
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { StrictMode } from 'react';
import SqlQueriesPage from './pages/sql-queries/page';
import AppLayout from './layouts/layout';
import './App.css';
import CategoriesPage from './pages/categories/page';
import InvoicesPage from './pages/invoices/page';
import StocksPage from './pages/stocks/page';
import UsersPage from './pages/users/page';
import PosPage from './pages/pos/page';
import SalesListPage from './pages/sales/page';
import { AuthProvider } from './context/auth-context';
import { ThemeProvider } from './components/theme-provider';
import { initDatabase } from './lib/init-database';
import SettingsPage from './pages/settings/page';
import DashboardPage from './pages/dashboard/page';
import { PosProvider } from './context/pos-context';
import { LowStockProvider } from './context/low-stock-context';

(async () => {
  await initDatabase();
})().catch(console.error);

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/invoices', element: <InvoicesPage /> },
      { path: '/sales', element: <SalesListPage /> },
      { path: '/pos', element: <PosPage /> },
      { path: '/stocks', element: <StocksPage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/sql', element: <SqlQueriesPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <PosProvider>
          <LowStockProvider>
            <RouterProvider router={router} />
          </LowStockProvider>
        </PosProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);