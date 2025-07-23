import * as React from 'react';
import {
  ChartBarIcon,
  Command,
  Frame,
  Map,
  PieChart,
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
import { LogoutButton } from './logout-button';
import { useAuth } from '@/auth/auth-context';
import { NavLink, useLocation } from 'react-router-dom';

const data = [
  { name: 'Stocks', url: '/stocks', icon: Frame },
  { name: 'Sales', url: '/sales', icon: PieChart },
  { name: 'Invoices', url: '/invoices', icon: Map },
  { name: 'Categories', url: '/categories', icon: Map },
  { name: 'Users', url: '/users', icon: User2 },
  { name: 'Pos', url: '/pos', icon: User2 },
  { name: 'Analytics', url: '/analytics', icon: ChartBarIcon },
  { name: 'Sql Queries', url: '/sql', icon: TerminalIcon },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects data={data} />
        <div className="mt-auto px-1 w-full">
          <LogoutButton />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

function NavProjects({
  data,
}: {
  data: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const location = useLocation();

  // Create a reactive data array with isActive state
  const reactiveData = React.useMemo(
    () =>
      data.map((item) => ({
        ...item,
        isActive: location.pathname === item.url,
      })),
    [data, location.pathname]
  );

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {reactiveData.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <NavLink
                to={item.url}
                end
                className={item.isActive ? 'bg-muted text-primary flex items-center gap-2' : 'text-muted-foreground flex items-center gap-2'}
              >
                <item.icon className="mr-2 size-4" />
                <span>{item.name}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}