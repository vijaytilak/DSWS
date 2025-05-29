"use client"

import { type LucideIcon, ArrowUpRight, ArrowDownRight, ArrowLeftRight, ArrowRightLeft, ArrowDown, ArrowUp } from "lucide-react"
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
  flowOption?: 'churn' | 'switching' | 'affinity' | 'spending';
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

const spendingItems = [
  {
    title: "Lower",
    url: "#",
    icon: ArrowDown,
    flowType: "Lower"
  },
  {
    title: "Higher",
    url: "#",
    icon: ArrowUp,
    flowType: "Higher"
  },
]

export function NavFlowTypes({ 
  items = defaultItems, // This default will be overridden if flowOption is 'spending'
  setFlowType, 
  currentFlowType,
  focusBubbleId = null,
  isMarketView = true,
  flowOption = 'churn'
}: NavFlowTypesProps) {
  const handleClick = (e: React.MouseEvent, flowType: string) => {
    e.preventDefault();
    setFlowType(flowType);
  };

  let itemsToRender;
  if (flowOption === 'spending') {
    itemsToRender = spendingItems;
  } else {
    // Apply original filtering logic for non-spending options
    itemsToRender = items.filter(item => {
      // For Brands (not Market view) with Churn flow option and no bubble selected
      if (!isMarketView && flowOption === 'churn' && focusBubbleId === null) {
        // Only show 'net' and 'both' options when no bubble is selected
        return item.title === 'net' || item.title === 'both';
      }
      // Show all items in other cases
      return true;
    });
  }


  return (
    <SidebarGroup>
      <SidebarGroupLabel>Flow Type</SidebarGroupLabel>
      <SidebarMenu>
        {itemsToRender.map((item) => (
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
