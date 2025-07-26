// main.tsx
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { StrictMode } from 'react';
import SqlQueriesPage from './pages/sql-queries/page';
import AppLayout from './layouts/layout';
import './App.css';
import CategoriesPage from './pages/categories/page';
import InvoicesPage from './pages/invoices_old/page';
import StocksPage from './pages/stocks/page';
import UsersPage from './pages/users/page';
import PosPage from './pages/pos/page';
import { AuthProvider } from './context/auth-context';
import { ThemeProvider } from './components/theme-provider';
import { initDatabase } from './lib/init-database';
import SettingsPage from './pages/settings/page';
import DashboardPage from './pages/dashboard/page';
import { LowStockProvider } from './context/low-stock-context';
import SchemaExplorer from './pages/sql-queries/schema-explorer';
import SingleProductPage from './pages/product/page';
import ProductsPage from './pages/products/page';
import SalesPage from './pages/sales/page';
import BulkCreateProducts from './pages/products/bulk-create/bulk-create-products';
import EntryInvoicesPage from './pages/invoices/entries/page';

(async () => {
  await initDatabase();
})().catch(console.error);

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/invoices', element: <SalesPage /> },
      { path: '/invoices/entries', element: <EntryInvoicesPage /> },
      { path: '/pos', element: <PosPage /> },
      { path: '/bulk-create-products', element: <BulkCreateProducts /> },
      { path: '/stocks', element: <StocksPage /> },
      { path: '/product-inventory', element: <ProductsPage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/sql', element: <SqlQueriesPage /> },
      { path: '/sql-explorer', element: <SchemaExplorer /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/products/:id?', element: <SingleProductPage /> },


    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <>
          <LowStockProvider>
            <RouterProvider router={router} />
          </LowStockProvider>
        </>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);