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
}

export function NavMain({
  items,
  setCentreFlow
}: NavMainProps) {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>("Brands"); // Default to Brands

  useEffect(() => {
    // Find the matching item based on URL or default to first item
    const matchingItem = items.find(item => item.url === pathname) || items.find(item => item.isActive) || items[0];
    if (matchingItem && !activeItem) {  // Only set if activeItem is not already set
      setActiveItem(matchingItem.title);
      // Set initial CentreFlow state
      if (setCentreFlow) {
        if (matchingItem.title === "Brands") {
          setCentreFlow(false);
        } else if (matchingItem.title === "Markets") {
          setCentreFlow(true);
        }
      }
    }
  }, [pathname, items, setCentreFlow, activeItem]);

  const handleClick = (item: { title: string }) => {
    if (!setCentreFlow) return;
    setActiveItem(item.title);

    if (item.title === "Brands") {
      setCentreFlow(false); // Disable CentreFlow
    } else if (item.title === "Markets") {
      setCentreFlow(true); // Enable CentreFlow
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={activeItem === item.title}>
              <Link href={item.url} onClick={() => handleClick(item)}>
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
