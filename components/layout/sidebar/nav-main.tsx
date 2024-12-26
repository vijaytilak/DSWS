"use client"

import { type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

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
    icon?: LucideIcon
    isActive?: boolean
  }[];
  setCentreFlow?: (value: boolean) => void;
  setIsMarketView?: (value: boolean) => void;
}

export function NavMain({
  items,
  setCentreFlow,
  setIsMarketView
}: NavMainProps) {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>("Brands"); // Default to Brands

  useEffect(() => {
    // Find the matching item based on URL or default to first item
    const matchingItem = items.find(item => item.url === pathname) || items.find(item => item.isActive) || items[0];
    if (matchingItem && !activeItem) {  // Only set if activeItem is not already set
      setActiveItem(matchingItem.title);
      // Set initial states
      if (setCentreFlow && setIsMarketView) {
        const isMarkets = matchingItem.title === "Markets";
        setCentreFlow(isMarkets);
        setIsMarketView(isMarkets);
      }
    }
  }, [pathname, items, setCentreFlow, setIsMarketView, activeItem]);

  const handleClick = (item: { title: string }) => {
    if (!setCentreFlow || !setIsMarketView) return;
    setActiveItem(item.title);

    const isMarkets = item.title === "Markets";
    setCentreFlow(isMarkets);
    setIsMarketView(isMarkets);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Views</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={activeItem === item.title}>
              <Link href={item.url} onClick={(e) => {
                e.preventDefault();
                handleClick(item);
              }}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
