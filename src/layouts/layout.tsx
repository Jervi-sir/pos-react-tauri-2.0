// layout.tsx
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/layouts/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { ModeToggle } from '@/components/mode-toggle';
import { useAuth } from '@/context/auth-context';
import { LoginPage } from '@/pages/auth/login';
import { StoreInfoProvider } from '../context/store-info-context';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingScreen from './loading-screen';

const AppLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isActive = location.pathname === "/settings";

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;

  return (
    <StoreInfoProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4 flex-1 pr-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <div className="ml-auto space-x-3" >
                <ModeToggle />
                <Button variant={isActive ? 'default' : 'outline'} size={'icon'} >
                  <Link to={"/settings"} >
                    <Settings className="h-[1.2rem] w-[1.2rem] transition-all" />
                  </Link>
                </Button>
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </StoreInfoProvider>
  );
};

export default AppLayout;