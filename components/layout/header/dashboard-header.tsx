'use client';

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { RightSidebarTrigger } from "@/components/ui/right-sidebar"
import dynamic from 'next/dynamic'
import { Controls } from "@/components/DataSphere/components/Controls"

const ThemeToggleClient = dynamic(
  () => import('@/components/layout/header/theme-toggle').then(mod => ({ default: mod.ThemeToggle })),
  { ssr: false }
)

interface DashboardHeaderProps {
  flowType: string;
  setFlowType: (value: string) => void;
  centreFlow: boolean;
  setCentreFlow: (value: boolean) => void;
  threshold: number;
  setThreshold: (value: number) => void;
}

export function DashboardHeader({
  flowType,
  setFlowType,
  centreFlow,
  setCentreFlow,
  threshold,
  setThreshold
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1" />
        <RightSidebarTrigger />
      </div>
    </header>
  )
}
