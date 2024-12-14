"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/layout/sidebar/nav-main"
import { NavProjects } from "@/components/layout/sidebar/nav-projects"
import { NavUser } from "@/components/layout/sidebar/nav-user"
import { AppLogo } from "@/components/layout/sidebar/app-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"

// This is sample data.
const data = {

  teams: [
    {
      name: "DataSphere",
      logo: GalleryVerticalEnd,
      plan: "Dashboard",
    }
  ],
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Profile",
          url: "/dashboard/profile",
        },
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    }
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  if (!user) return null

  const userDetails = {
    name: user.displayName || 'User',
    email: user.email || '',
    avatar: user.photoURL || ''
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppLogo teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userDetails} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
