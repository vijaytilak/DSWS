'use client';

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
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
    <header className="border-b bg-background">
      <div className="flex h-16 items-center gap-4 px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-2" />
          <Separator orientation="vertical" className="h-6" />
        </div>
        <Controls
          threshold={threshold}
          setThreshold={setThreshold}
          flowType={flowType}
          setFlowType={setFlowType}
          centreFlow={centreFlow}
          setCentreFlow={setCentreFlow}
          className="flex-1"
        />
        <ThemeToggleClient />
      </div>
    </header>
  )
}
