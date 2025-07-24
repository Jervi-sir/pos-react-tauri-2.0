import * as React from 'react';
import {
  ChartBarIcon,
  Command,
  Frame,
  LogOutIcon,
  Map,
  PieChart,
  Settings,
  TerminalIcon,
  User2,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { useAuth } from '@/auth/auth-context';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStoreInfo } from './store-info-context';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const { storeInfo } = useStoreInfo();

  // Define navigation items with canAccess as an array of roles
  const data = [
    { name: 'Stocks', url: '/stocks', icon: Frame, canAccess: ['owner', 'admin', 'cashier'] },
    { name: 'Sales', url: '/sales', icon: PieChart, canAccess: ['owner', 'admin', 'cashier'] },
    { name: 'Invoices', url: '/invoices', icon: Map, canAccess: ['owner', 'admin', 'cashier'] },
    { name: 'Categories', url: '/categories', icon: Map, canAccess: ['owner', 'admin', 'cashier'] },
    { name: 'Users', url: '/users', icon: User2, canAccess: ['owner', 'admin'] },
    { name: 'Pos', url: '/pos', icon: User2, canAccess: ['owner', 'admin', 'cashier'] },
    { name: 'Analytics', url: '/analytics', icon: ChartBarIcon, canAccess: ['owner', 'admin'] },
    { name: 'Sql Queries', url: '/sql', icon: TerminalIcon, canAccess: ['owner'] },
    { name: 'Settings', url: '/settings', icon: Settings, canAccess: ['owner', 'admin'] },
  ];

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-full">
                  {storeInfo.logo_base64 ? (
                    <img
                      src={storeInfo.logo_base64}
                      alt={storeInfo.name}
                      className="h-8 w-8 object-cover rounded-full"
                    />
                  ) : (
                    <Command className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{storeInfo.name || 'Jervi'}</span>
                  <span className="truncate text-xs">Store</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects data={data} userRole={user?.role} />

        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Button variant="link" onClick={logout} className="cursor-pointer justify-start px-0">
                  <LogOutIcon />
                  <span>Logout</span>
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

function NavProjects({
  data,
  userRole,
}: {
  data: {
    name: string;
    url: string;
    icon: LucideIcon;
    canAccess: string[];
  }[];
  userRole: string | undefined;
}) {
  const location = useLocation();

  // Filter data based on user role
  const filteredData = data.filter((item) => {
    // If userRole is undefined or null, only show items accessible to all roles
    if (!userRole) return false;
    // Show item if user's role is in the canAccess array
    return item.canAccess.includes(userRole);
  });

  // Create a reactive data array with isActive state
  const reactiveData = React.useMemo(
    () =>
      filteredData.map((item) => ({
        ...item,
        isActive: location.pathname === item.url,
      })),
    [filteredData, location.pathname]
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {reactiveData.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  className={cn([
                    isActive ? 'bg-muted text-primary flex items-center gap-2' : 'text-muted-foreground flex items-center gap-2',
                    item.url === '/settings' && 'mt-auto',
                  ])}
                >
                  {item.icon && <item.icon className="mr-2 size-4" />}
                  <span>{item.name}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}