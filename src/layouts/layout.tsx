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
import { Loader, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AppLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isActive = location.pathname === "/settings";

  if (loading) return <div className="h-[100vh] w-[100vw] flex justify-center items-center"><Loader2 className='animate-spin' /></div>;
  if (!user) return <LoginPage />;

  return (
    <StoreInfoProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4 flex-1 pr-4">
              <SidebarTrigger className="-ml-1" />
              <ModeToggle />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Button variant={isActive ? 'default' : 'outline'} size={'icon'} className="ml-auto" >
                <Link to={"/settings"} >
                  <Settings className="h-[1.2rem] w-[1.2rem] transition-all" />
                </Link>
              </Button>
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