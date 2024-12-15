"use client"

import * as React from "react"
import { Settings2 } from "lucide-react"

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
      <RightSidebarHeader className="h-16 border-b border-sidebar-border">
        <div className="flex h-full items-center px-4">
          <Settings2 className="mr-2 h-5 w-5" />
          <span>Settings</span>
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
