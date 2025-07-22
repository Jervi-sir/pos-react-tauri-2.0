import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router";
import { StrictMode } from 'react';
import App from './App';
import SqlQueriesPage from './pages/sql-queries/page';
import AppLayout from './layouts/layout';
import './App.css'
import CategoriesPage from './pages/categories/page';
import InvoicesPage from './pages/invoinces/page';
import StocksPage from './pages/stocks/page';
import UsersPage from './pages/users/page';
import PosPage from './pages/pos/page';
import SalesListPage from './pages/sales/page';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/categories', element: <CategoriesPage /> },
  { path: '/invoices', element: <InvoicesPage /> },
  { path: '/sales', element: <SalesListPage /> },
  { path: '/pos', element: <PosPage /> },
  { path: '/stocks', element: <StocksPage /> },
  { path: '/users', element: <UsersPage /> },
  { path: '/sql', element: <SqlQueriesPage /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppLayout>
      <RouterProvider router={router} />
    </AppLayout>
  </StrictMode>,
)
