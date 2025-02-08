'use client';

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import dynamic from 'next/dynamic'
import { Controls } from "@/components/Datasphere/components/Controls"
import { useState } from "react"
import MonthSelector from "@/components/Datasphere/utils/time-selector"

const ThemeToggleClient = dynamic(
  () => import('@/components/layout/header/theme-toggle').then(mod => ({ default: mod.ThemeToggle })),
  { ssr: false }
)

interface DashboardHeaderProps {
  threshold: number;
  setThreshold: (value: number) => void;
  flowType: string;
  setFlowType: (value: string) => void;
  centreFlow: boolean;
  setCentreFlow: (value: boolean) => void;
}

export function DashboardHeader({
  threshold,
  setThreshold,
  flowType,
  setFlowType,
  centreFlow,
  setCentreFlow
}: DashboardHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Controls
          threshold={threshold}
          setThreshold={setThreshold}
          flowType={flowType}
          setFlowType={setFlowType}
          centreFlow={centreFlow}
          setCentreFlow={setCentreFlow}
          className="flex-1"
        />
        <div>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} modal={true}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                title="Time Settings"
                onBlur={(e) => {
                  if (drawerOpen) {
                    e.preventDefault();
                    e.currentTarget.focus();
                  }
                }}
              >
                <Settings className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="focus:outline-none">
              <div onFocus={(e) => e.stopPropagation()}>
                <DrawerHeader>
                  <DrawerTitle>Time Selector</DrawerTitle>
                  <DrawerDescription>
                    Adjust time range
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-4 flex flex-col gap-4">
                  <div>
                    <MonthSelector />
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        <ThemeToggleClient />
      </div>
    </header>
  );
}
