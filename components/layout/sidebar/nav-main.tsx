"use client"

import { type LucideIcon } from "lucide-react"
import Link from "next/link"

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
  const handleClick = (item: { title: string }) => {
    if (!setCentreFlow) return;

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
            <SidebarMenuButton asChild>
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
