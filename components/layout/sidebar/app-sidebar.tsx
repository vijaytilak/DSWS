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

type FlowOption = 'churn' | 'switching';
type View = 'Markets' | 'Brands';

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
  focusBubbleId?: number | null;
  isMarketView?: boolean;
};

export function AppSidebar({ 
  setCentreFlow, 
  setFlowType, 
  flowType, 
  onFlowOptionChange,
  setIsMarketView,
  flowOption = 'churn',
  focusBubbleId = null,
  isMarketView = true,
  ...props 
}: AppSidebarProps) {
  const { user } = useAuth()
  const [selectedView, setSelectedView] = React.useState<View>('Markets')

  if (!user) return null

  const userDetails = {
    name: user.displayName || 'User',
    email: user.email || '',
    avatar: user.photoURL || ''
  }

  const handleViewChange = (view: string) => {
    const isMarkets = view === 'Markets';
    setSelectedView(view as View);
    setCentreFlow(isMarkets);
    setIsMarketView(isMarkets);
    
    // Reset to Churn and net when view changes
    onFlowOptionChange?.('churn');
    setFlowType('net');
  };

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
          onViewChange={handleViewChange}
        />
        <NavOptions 
          onFlowOptionChange={(option: FlowOption) => onFlowOptionChange?.(option)} 
          flowOption={flowOption}
          selectedView={selectedView}
        />
        <NavFlowTypes 
          setFlowType={setFlowType} 
          currentFlowType={flowType}
          focusBubbleId={focusBubbleId}
          isMarketView={isMarketView}
          flowOption={flowOption}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userDetails} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
