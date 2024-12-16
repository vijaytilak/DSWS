"use client"

import * as React from "react"
import { Settings2 } from "lucide-react"
import Link from "next/link"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  RightSidebar,
  RightSidebarContent,
  RightSidebarFooter,
  RightSidebarHeader,
} from "@/components/ui/right-sidebar"

// Generate sample data
const generateSampleData = () => {
  const data = []
  for (let i = 1; i <= 20; i++) {
    data.push({
      item: `Item ${i}`,
      abs: (Math.random() * 100).toFixed(1) + '%',
      index: Math.floor(Math.random() * 200),
    })
  }
  return data
}

const sampleData = generateSampleData()

export function AppRightSidebar({
  ...props
}: React.ComponentProps<typeof RightSidebar>) {
  return (
    <RightSidebar
      collapsible="icon"
      className="sticky top-0 h-svh border-l flex flex-col overflow-hidden"
      {...props}
    >
      <RightSidebarHeader className="flex-none border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Settings2 />
          </div>
          <span className="font-semibold">Data Table</span>
        </div>
      </RightSidebarHeader>
      <RightSidebarContent className="flex-1 overflow-y-auto p-4">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="font-bold bg-muted/50">Item</TableHead>
              <TableHead className="text-right font-bold bg-muted/50">Index</TableHead>
              <TableHead className="text-right font-bold bg-muted/50">ABS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleData.map((item) => (
              <TableRow key={item.item} className="hover:bg-muted/50 border-b">
                <TableCell className="font-medium">{item.item}</TableCell>
                <TableCell className="text-right">{item.index}</TableCell>
                <TableCell className="text-right">{item.abs}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </RightSidebarContent>
      <RightSidebarFooter className="flex-none border-t border-sidebar-border p-2">
        <div className="text-xs text-muted-foreground">
          {sampleData.length} items
        </div>
      </RightSidebarFooter>
    </RightSidebar>
  )
}
