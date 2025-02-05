"use client"

import { type LucideIcon } from "lucide-react"
import { useState } from "react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavMainProps {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
  }[];
  setCentreFlow: (value: boolean) => void;
  setIsMarketView: (value: boolean) => void;
  onViewChange: (view: string) => void;
}

export function NavMain({ items, setCentreFlow, setIsMarketView, onViewChange }: NavMainProps) {
  const [activeView, setActiveView] = useState<string>('Markets')

  const handleClick = (title: string) => {
    setActiveView(title);
    onViewChange(title);
    if (setCentreFlow && setIsMarketView) {
      const isMarkets = title === "Markets";
      setCentreFlow(isMarkets);
      setIsMarketView(isMarkets);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Views</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              isActive={activeView === item.title}
              onClick={() => handleClick(item.title)}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
