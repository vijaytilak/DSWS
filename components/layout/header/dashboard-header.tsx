'use client';

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { RightSidebarTrigger } from "@/components/ui/right-sidebar"
import dynamic from 'next/dynamic'
import { Controls } from "@/components/Datasphere/components/Controls"

const ThemeToggleClient = dynamic(
  () => import('@/components/layout/header/theme-toggle').then(mod => ({ default: mod.ThemeToggle })),
  { ssr: false }
)

interface DashboardHeaderProps {
  threshold: number;
  setThreshold: (value: number) => void;
}

export function DashboardHeader({
  threshold,
  setThreshold
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Controls
          threshold={threshold}
          setThreshold={setThreshold}
        />
        <div className="flex-1" />
        <ThemeToggleClient />
        <RightSidebarTrigger />
      </div>
    </header>
  )
}
