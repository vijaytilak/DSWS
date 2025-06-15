"use client"

import { type LucideIcon, ArrowUpRight, ArrowDownRight, ArrowLeftRight, ArrowRightLeft } from "lucide-react"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavFlowTypesProps {
  setFlowType: (value: string) => void;
  currentFlowType: string;
  items?: {
    title: string
    url: string
    icon: LucideIcon
    flowType: string
  }[]
  focusBubbleId?: number | null;
  isMarketView?: boolean;
  flowOption?: 'churn' | 'switching' | 'affinity';
}

const defaultItems = [
  {
    title: "out",
    url: "#",
    icon: ArrowUpRight,
    flowType: "outFlow only"
  },
  {
    title: "in",
    url: "#",
    icon: ArrowDownRight,
    flowType: "inFlow only"
  },
  {
    title: "net",
    url: "#",
    icon: ArrowRightLeft,
    flowType: "netFlow"
  },
  {
    title: "both",
    url: "#",
    icon: ArrowLeftRight,
    flowType: "bi-directional"
  },
]

export function NavFlowTypes({ 
  items = defaultItems, 
  setFlowType, 
  currentFlowType
}: NavFlowTypesProps) {
  const handleClick = (e: React.MouseEvent, flowType: string) => {
    e.preventDefault();
    setFlowType(flowType);
  };

  // Use all items
  const filteredItems = items;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Flow Type</SidebarGroupLabel>
      <SidebarMenu>
        {filteredItems.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton 
              asChild
              isActive={currentFlowType === item.flowType}
            >
              <Link 
                href={item.url} 
                onClick={(e) => handleClick(e, item.flowType)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
