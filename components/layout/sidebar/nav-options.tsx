"use client"

import { type LucideIcon, Activity, Repeat, Heart } from "lucide-react"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavOptionsProps {
  items?: {
    title: string
    url: string
    icon: LucideIcon
  }[]
}

const defaultItems = [
  {
    title: "Churn",
    url: "#",
    icon: Activity,
  },
  {
    title: "Switching",
    url: "#",
    icon: Repeat,
  },
  {
    title: "Affinity",
    url: "#",
    icon: Heart,
  },
]

export function NavOptions({ items = defaultItems }: NavOptionsProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Options</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild>
              <Link href={item.url}>
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
