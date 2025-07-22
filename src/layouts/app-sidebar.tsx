import * as React from "react"
import {
  Command,
  Frame,
  Map,
  PieChart,
  TerminalIcon,
  User2,
} from "lucide-react"

import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LogoutButton } from "./logout-button"
import { useAuth } from "@/auth/auth-context"

const data = {
  projects: [
    {
      name: "Stocks",
      url: "/stocks",
      icon: Frame,
    },
    {
      name: "Sales",
      url: "/sales",
      icon: PieChart,
    },
    {
      name: "Invoices",
      url: "/invoices",
      icon: Map,
    },
    {
      name: "Categories",
      url: "/categories",
      icon: Map,
    },
    {
      name: "Users",
      url: "/users",
      icon: User2,
    },
    {
      name: "Pos",
      url: "/pos",
      icon: User2,
    },
    {
      name: "Sql Queries",
      url: "/sql",
      icon: TerminalIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} />
        <div className="mt-auto px-1 w-full" >
          <LogoutButton />  
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
