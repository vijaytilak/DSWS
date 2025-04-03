"use client"

import * as React from "react"
import { Settings2 } from "lucide-react"
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
import { useTableData } from "@/app/contexts/table-data-context"
import { TableDataItem } from "@/components/Datasphere/types"

export function AppRightSidebar({
  ...props
}: React.ComponentProps<typeof RightSidebar>) {
  const { tableData, selectedItemLabel } = useTableData();

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
          <span className="font-semibold">{selectedItemLabel || 'Data Table'}</span>
        </div>
      </RightSidebarHeader>
      <RightSidebarContent className="flex-1 overflow-y-auto p-2">
        {tableData.length > 0 ? (
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="font-bold bg-muted/50 py-2 px-2">Item</TableHead>
                <TableHead className="text-right font-bold bg-muted/50 py-2 px-2">Index</TableHead>
                <TableHead className="text-right font-bold bg-muted/50 py-2 px-2">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((item: TableDataItem, index: number) => (
                <TableRow key={index} className="hover:bg-muted/50 border-b">
                  <TableCell className="font-medium py-1.5 px-2">{item.item}</TableCell>
                  <TableCell className="text-right py-1.5 px-2">{item.index}</TableCell>
                  <TableCell className="text-right py-1.5 px-2">{item.abs}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Click a bubble or flow to view its data
          </div>
        )}
      </RightSidebarContent>
      <RightSidebarFooter className="flex-none border-t border-sidebar-border p-2">
        <div className="text-xs text-muted-foreground">
          {tableData.length} items
        </div>
      </RightSidebarFooter>
    </RightSidebar>
  )
}
