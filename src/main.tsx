import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { StrictMode } from 'react';
import SqlQueriesPage from './pages/sql-queries/page';
import AppLayout from './layouts/layout';
import './App.css';
import CategoriesPage from './pages/categories/page';
import UsersPage from './pages/users/page';
import PosPage from './pages/pos/page';
import { AuthProvider } from './context/auth-context';
import { ThemeProvider } from './components/theme-provider';
import SettingsPage from './pages/settings/page';
import DashboardPage from './pages/dashboard/page';
import { LowStockProvider } from './context/low-stock-context';
import SchemaExplorer from './pages/sql-queries/schema-explorer';
import SingleProductPage from './pages/product/page';
import ProductsPage from './pages/inventory/page';
import SalesPage from './pages/invoices/sales/page';
import BulkCreateProducts from './pages/inventory/bulk-create/bulk-create-products';
import EntryInvoicesPage from './pages/invoices/entries/page';
import { DocumentsPathProvider } from './context/document-path-context';
import { StoreInfoProvider } from './context/store-info-context';

export const routes = {
  dashboard: '/',
  categories: '/categories',
  invoicesSales: '/invoices/sales',
  invoicesEntries: '/invoices/entries',
  pos: '/pos',
  BulkCreateProducts: '/bulk-create-products',
  productInventory: '/product-inventory',
  users: '/users',
  sql: '/sql',
  sqlExplorer: '/sql-explorer',
  settings: '/settings',
  product: '/products/',
  productId: '/products/',
};

function App() {

  // Main app routes when setup is complete
  const router = createBrowserRouter([
    {
      element: <AppLayout />,
      children: [
        { path: routes.dashboard, element: <DashboardPage /> },
        { path: routes.categories, element: <CategoriesPage /> },
        { path: routes.invoicesSales, element: <SalesPage /> },
        { path: routes.invoicesEntries, element: <EntryInvoicesPage /> },
        { path: routes.pos, element: <PosPage /> },
        { path: routes.BulkCreateProducts, element: <BulkCreateProducts /> },
        { path: routes.productInventory, element: <ProductsPage /> },
        { path: routes.users, element: <UsersPage /> },
        { path: routes.sql, element: <SqlQueriesPage /> },
        { path: routes.sqlExplorer, element: <SchemaExplorer /> },
        { path: routes.settings, element: <SettingsPage /> },
        { path: routes.product + ':id?', element: <SingleProductPage /> },
      ],
    },
  ]);

  return (
    <DocumentsPathProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <StoreInfoProvider>
            <LowStockProvider>
              <RouterProvider router={router} />
            </LowStockProvider>
          </StoreInfoProvider>
        </AuthProvider>
      </ThemeProvider>
    </DocumentsPathProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);