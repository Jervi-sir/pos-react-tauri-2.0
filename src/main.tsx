// main.tsx
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
import { initDatabase } from './lib/init-database';
import SettingsPage from './pages/settings/page';
import DashboardPage from './pages/dashboard/page';
import { LowStockProvider } from './context/low-stock-context';
import SchemaExplorer from './pages/sql-queries/schema-explorer';
import SingleProductPage from './pages/product/page';
import ProductsPage from './pages/inventory/page';
import SalesPage from './pages/invoices/sales/page';
import BulkCreateProducts from './pages/inventory/bulk-create/bulk-create-products';
import EntryInvoicesPage from './pages/invoices/entries/page';

(async () => {
  await initDatabase();
})().catch(console.error);

export const routes = {
  dashboard: '/',                               // done
  categories: '/categories',                    // done
  invoicesSales: '/invoices/sales',             // done
  invoicesEntries: '/invoices/entries',         // done
  pos: '/pos',                                  // done
  BulkCreateProducts: '/bulk-create-products',  // done
  productInventory: '/product-inventory',       // done
  users: '/users',                              // done
  sql: '/sql',                                  // done
  sqlExplorer: '/sql-explorer',                 // done
  settings: '/settings',                        // done
  product: '/products/',                    // done
  productId: '/products/',
}

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