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
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingScreen from './loading-screen';
import { routes } from '@/main';
import { useEffect, useState } from 'react';
import { initDatabase } from '@/lib/init-database';
import { runSql } from '@/runSql';
import { SetupStorePage } from '@/setup/store';
import { SetupOwnerPage } from '@/setup/owner';

const AppLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isActive = location.pathname === routes.settings;

  const [storeSetupComplete, setStoreSetupComplete] = useState<boolean | null>(null);
  const [ownerSetupComplete, setOwnerSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSetup = async () => {
      await initDatabase();
      try {
        // Check for store_info
        const storeRes: any = await runSql(`SELECT COUNT(*) as count FROM store_info`);
        setStoreSetupComplete(storeRes[0].count > 0);

        // Check for owner
        const ownerRes: any = await runSql(`SELECT COUNT(*) as count FROM users WHERE role = 'owner'`);
        setOwnerSetupComplete(ownerRes[0].count > 0);
      } catch (error) {
        console.error("Error checking setup:", error);
        setStoreSetupComplete(false);
        setOwnerSetupComplete(false);
      }
    };
    checkSetup();
  }, []);

  if (loading) return <LoadingScreen />;
  // Show loading screen while checking setup status
  if (storeSetupComplete === null || ownerSetupComplete === null) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  // Show SetupStorePage if store_info is not complete
  if (!storeSetupComplete) {
    return <SetupStorePage onComplete={() => setStoreSetupComplete(true)} />;
  }
  // Show SetupOwnerPage if owner is not complete
  if (!ownerSetupComplete) {
    return <SetupOwnerPage />;
  }

  if (!user) return <LoginPage />;

  return (
    <>
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
                  <Link to={routes.settings} >
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
    </>
  );
};

export default AppLayout;