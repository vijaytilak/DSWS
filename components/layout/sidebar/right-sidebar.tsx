"use client"

import * as React from "react"
import { Settings2 } from "lucide-react"
import Link from "next/link"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

import {
  RightSidebar,
  RightSidebarContent,
  RightSidebarFooter,
  RightSidebarHeader,
} from "@/components/ui/right-sidebar"

export function AppRightSidebar({
  ...props
}: React.ComponentProps<typeof RightSidebar>) {
  return (
    <RightSidebar
      collapsible="icon"
      className="sticky top-0 h-svh border-l"
      {...props}
    >
      <RightSidebarHeader>
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Settings2 />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight pl-3">
          <span className="truncate font-semibold">
            Data Table
          </span>
        </div>
      </RightSidebarHeader>
      <RightSidebarContent>
        {/* Add your right sidebar content here */}
      </RightSidebarContent>
      <RightSidebarFooter>
        {/* Add your right sidebar footer here */}
      </RightSidebarFooter>
    </RightSidebar>
  )
}
