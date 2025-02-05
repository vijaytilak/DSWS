"use client"

import * as React from "react"
import {
  GalleryVerticalEnd,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/layout/sidebar/nav-main"
import { NavOptions } from "@/components/layout/sidebar/nav-options"
import { NavFlowTypes } from "@/components/layout/sidebar/nav-flowtypes"
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

type FlowOption = 'churn' | 'switching' | 'affinity';

// This is sample data.
const data = {
  teams: [
    {
      name: "DataSphere",
      logo: GalleryVerticalEnd,
      plan: "SphereCo Ltd.",
    }
  ],
  navMain: [
    {
      title: "Markets",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "Brands",
      url: "#",
      icon: Settings2,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  setCentreFlow: (value: boolean) => void;
  setFlowType: (value: string) => void;
  flowType: string;
  onFlowOptionChange?: (option: FlowOption) => void;
  setIsMarketView: (value: boolean) => void;
  flowOption?: FlowOption;
};

export function AppSidebar({ 
  setCentreFlow, 
  setFlowType, 
  flowType, 
  onFlowOptionChange,
  setIsMarketView,
  flowOption = 'churn',
  ...props 
}: AppSidebarProps) {
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
        <NavMain 
          items={data.navMain} 
          setCentreFlow={setCentreFlow}
          setIsMarketView={setIsMarketView}
        />
        <NavOptions 
          onFlowOptionChange={onFlowOptionChange || (() => {})} 
          flowOption={flowOption}
        />
        <NavFlowTypes setFlowType={setFlowType} currentFlowType={flowType} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userDetails} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
